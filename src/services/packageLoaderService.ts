import JSZip from 'jszip';
import { r2Client } from './r2Client';
import { PackageMetadataService } from './packageMetadataService';
import type { Playlist, Video, PlaylistExport } from '../types';

export interface SavedPackage {
  r2Key: string;
  filename: string;
  packageName: string;
  size: number;
  lastModified: Date;
  metadata?: {
    videoCount: string;
    playlistCount: string;
    createdAt: string;
  };
  // Additional attributes for display
  playlistCount?: number;
  videoCount?: number;
  playlistNames?: string[];
}

export interface LoadedPackageStructure {
  packageName: string;
  playlists: PlaylistExport[];
  metadata: any;
  requiredVideos: string[]; // filenames that need to exist in repository
}

export interface ImportResult {
  success: boolean;
  importedPlaylists: Playlist[];
  missingVideos: string[];
  errors?: string[];
}

export class PackageLoaderService {
  
  /**
   * List all saved playlist packages from R2 storage
   */
  static async listSavedPackages(): Promise<{ packages: SavedPackage[]; error?: string }> {
    if (!r2Client.isConfigured()) {
      return { packages: [], error: 'R2 client not configured' };
    }

    try {
      console.log('📦 Listing saved packages from R2...');
      const result = await r2Client.listObjects('playlists/', 100);
      
      const packages: SavedPackage[] = [];
      
      // Process each package and extract metadata
      for (const obj of result.objects.filter(obj => obj.key.endsWith('.zip'))) {
        // Extract package name from filename
        const filename = obj.key.split('/').pop() || obj.key;
        const packageName = filename
          .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '') // Remove timestamp
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()); // Title case
        
        const savedPackage: SavedPackage = {
          r2Key: obj.key,
          filename,
          packageName,
          size: obj.size,
          lastModified: obj.lastModified,
          metadata: undefined
        };
        
        // Try to fetch metadata file first (fast)
        const metadata = await PackageMetadataService.fetchMetadata(obj.key);
        if (metadata) {
          savedPackage.playlistCount = metadata.playlistCount;
          savedPackage.videoCount = metadata.videoCount;
          savedPackage.playlistNames = metadata.playlistNames;
          console.log(`✅ Loaded metadata from file for ${filename}`);
        } else {
          // Fallback: Try to generate metadata from ZIP (slower, but works for old packages)
          console.log(`⚠️ No metadata file for ${filename}, attempting to generate...`);
          try {
            const generateResult = await PackageMetadataService.generateMetadataForExistingPackage(obj.key);
            if (generateResult.success && generateResult.metadata) {
              savedPackage.playlistCount = generateResult.metadata.playlistCount;
              savedPackage.videoCount = generateResult.metadata.videoCount;
              savedPackage.playlistNames = generateResult.metadata.playlistNames;
              console.log(`✅ Generated and saved metadata for ${filename}`);
            }
          } catch (err) {
            console.warn(`Could not generate metadata for ${obj.key}:`, err);
          }
        }
        
        packages.push(savedPackage);
      }
      
      // Sort by most recent first
      packages.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      console.log(`✅ Found ${packages.length} saved packages`);
      return { packages };
    } catch (error) {
      console.error('❌ Failed to list saved packages:', error);
      return {
        packages: [],
        error: error instanceof Error ? error.message : 'Failed to list packages'
      };
    }
  }

  /**
   * Download and parse a package ZIP file to extract its structure
   */
  static async loadPackageStructure(r2Key: string): Promise<{ structure?: LoadedPackageStructure; error?: string }> {
    if (!r2Client.isConfigured()) {
      return { error: 'R2 client not configured' };
    }

    try {
      console.log(`📥 Downloading package structure from: ${r2Key}`);
      
      // Download ZIP file from R2
      const downloadResult = await r2Client.getObject(r2Key);
      if (!downloadResult.success || !downloadResult.data) {
        throw new Error(downloadResult.error || 'Failed to download package');
      }

      // Parse ZIP file
      const zip = new JSZip();
      const zipData = await zip.loadAsync(downloadResult.data);

      // Extract package name from key
      const filename = r2Key.split('/').pop() || r2Key;
      const packageName = filename
        .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      // Extract metadata.json
      const metadataFile = zipData.file('content/packages/metadata.json');
      let metadata = null;
      if (metadataFile) {
        const metadataContent = await metadataFile.async('text');
        metadata = JSON.parse(metadataContent);
      }

      // Extract playlist JSON files
      const playlists: PlaylistExport[] = [];
      const requiredVideos: string[] = [];

      const playlistFiles = Object.keys(zipData.files)
        .filter(path => path.startsWith('content/playlists/') && path.endsWith('.json'));

      for (const filePath of playlistFiles) {
        const file = zipData.file(filePath);
        if (file) {
          const content = await file.async('text');
          const playlistData: PlaylistExport = JSON.parse(content);
          playlists.push(playlistData);
          
          // Collect required video filenames
          playlistData.videos.forEach(video => {
            if (!requiredVideos.includes(video.filename)) {
              requiredVideos.push(video.filename);
            }
          });
        }
      }

      console.log(`✅ Loaded package structure: ${playlists.length} playlists, ${requiredVideos.length} required videos`);

      return {
        structure: {
          packageName,
          playlists,
          metadata,
          requiredVideos
        }
      };
    } catch (error) {
      console.error(`❌ Failed to load package structure from ${r2Key}:`, error);
      return {
        error: error instanceof Error ? error.message : 'Failed to load package structure'
      };
    }
  }

  /**
   * Import playlists from a loaded package, validating that videos exist in current repository
   */
  static async importPlaylistsFromPackage(
    packageStructure: LoadedPackageStructure,
    currentVideos: Video[]
  ): Promise<ImportResult> {
    try {
      console.log(`🔄 Importing playlists from package: ${packageStructure.packageName}`);
      
      const currentVideoFilenames = new Set(currentVideos.map(v => v.filename));
      const missingVideos: string[] = [];
      const importedPlaylists: Playlist[] = [];

      // Check which videos are missing
      packageStructure.requiredVideos.forEach(filename => {
        if (!currentVideoFilenames.has(filename)) {
          missingVideos.push(filename);
        }
      });

      // Convert each DBTV playlist to internal format
      for (const dbtvPlaylist of packageStructure.playlists) {
        // Filter out videos that don't exist in current repository
        const availableVideos = dbtvPlaylist.videos.filter(video => 
          currentVideoFilenames.has(video.filename)
        );

        if (availableVideos.length === 0) {
          console.warn(`⚠️ Skipping playlist "${dbtvPlaylist.name}" - no videos available`);
          continue;
        }

        // Find video IDs for available videos
        const videoIds: string[] = [];
        const videoOrder: string[] = [];

        availableVideos.forEach(dbtvVideo => {
          const video = currentVideos.find(v => v.filename === dbtvVideo.filename);
          if (video) {
            videoIds.push(video.id);
            videoOrder.push(video.id);
          }
        });

        // Create internal playlist format
        const importedPlaylist: Playlist = {
          id: this.generatePlaylistId(), // Generate new ID to avoid conflicts
          name: `${dbtvPlaylist.name} (imported)`, // Mark as imported to avoid confusion
          description: dbtvPlaylist.description || '',
          videoIds,
          videoOrder,
          dateCreated: new Date(),
          lastModified: new Date(),
          tags: [], // DBTV playlists don't have tags
          metadata: {
            totalDuration: availableVideos.reduce((sum, video) => sum + (video.duration_seconds || 0), 0),
            videoCount: availableVideos.length,
            totalSize: availableVideos.reduce((sum, video) => {
              const vid = currentVideos.find(v => v.filename === video.filename);
              return sum + (vid?.fileSize || 0);
            }, 0)
          }
        };

        importedPlaylists.push(importedPlaylist);
        console.log(`✅ Imported playlist "${importedPlaylist.name}" with ${videoIds.length} videos`);
      }

      const result: ImportResult = {
        success: importedPlaylists.length > 0,
        importedPlaylists,
        missingVideos
      };

      if (missingVideos.length > 0) {
        console.warn(`⚠️ Import completed with ${missingVideos.length} missing videos:`, missingVideos.slice(0, 5));
      }

      if (importedPlaylists.length === 0) {
        result.success = false;
        result.errors = ['No playlists could be imported - all required videos are missing from the repository'];
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to import playlists from package:', error);
      return {
        success: false,
        importedPlaylists: [],
        missingVideos: [],
        errors: [error instanceof Error ? error.message : 'Import failed']
      };
    }
  }

  /**
   * Download a package ZIP file directly (for "Download ZIP" functionality)
   */
  static async downloadPackage(r2Key: string): Promise<{ success: boolean; error?: string }> {
    if (!r2Client.isConfigured()) {
      return { success: false, error: 'R2 client not configured' };
    }

    try {
      console.log(`⬇️ Downloading package: ${r2Key}`);
      
      // Download from R2
      const downloadResult = await r2Client.getObject(r2Key);
      if (!downloadResult.success || !downloadResult.data) {
        throw new Error(downloadResult.error || 'Failed to download package');
      }

      // Create blob and trigger download
      const blob = new Blob([downloadResult.data], { type: 'application/zip' });
      const filename = r2Key.split('/').pop() || 'package.zip';
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`✅ Package downloaded: ${filename}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to download package ${r2Key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Generate a unique playlist ID
   */
  private static generatePlaylistId(): string {
    return `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Delete a package from R2 storage
   */
  static async deletePackage(r2Key: string): Promise<{ success: boolean; error?: string }> {
    if (!r2Client.isConfigured()) {
      return { success: false, error: 'R2 client not configured' };
    }

    try {
      console.log(`🗑️ Deleting package: ${r2Key}`);
      
      // Delete the package file
      const result = await r2Client.deleteObject(r2Key);
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }
      
      // Also delete the metadata file if it exists
      const metadataResult = await PackageMetadataService.deleteMetadata(r2Key);
      if (!metadataResult.success) {
        console.warn(`Failed to delete metadata file: ${metadataResult.error}`);
        // Don't fail the operation if metadata deletion fails
      }
      
      console.log(`✅ Package and metadata deleted successfully: ${r2Key}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to delete package ${r2Key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}