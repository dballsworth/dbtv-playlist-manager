import { r2Client } from './r2Client';
import type { Playlist, Video } from '../types';
import JSZip from 'jszip';

/**
 * Structure for package metadata stored as separate JSON files
 */
export interface PackageMetadata {
  packageName: string;
  filename: string;
  playlistCount: number;
  videoCount: number;
  playlistNames: string[];
  totalSize: number;
  createdAt: string;
  version: string;
}

export class PackageMetadataService {
  private static readonly METADATA_VERSION = '1.0';
  
  /**
   * Generate metadata JSON key from package key
   * e.g., "playlists/package.zip" -> "playlists/package.meta.json"
   */
  static getMetadataKey(packageKey: string): string {
    return packageKey.replace(/\.zip$/, '.meta.json');
  }
  
  /**
   * Generate metadata from package contents
   */
  static generateMetadata(
    packageName: string,
    filename: string,
    playlists: Playlist[],
    videos: Video[],
    zipSize: number
  ): PackageMetadata {
    // Get unique video count (videos might be in multiple playlists)
    const uniqueVideos = new Set<string>();
    playlists.forEach(playlist => {
      playlist.videoIds.forEach(id => uniqueVideos.add(id));
    });
    
    return {
      packageName,
      filename,
      playlistCount: playlists.length,
      videoCount: videos.length,
      playlistNames: playlists.map(p => p.name),
      totalSize: zipSize,
      createdAt: new Date().toISOString(),
      version: this.METADATA_VERSION
    };
  }
  
  /**
   * Save metadata to R2 as a separate JSON file
   */
  static async saveMetadata(
    packageKey: string,
    metadata: PackageMetadata
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const metadataKey = this.getMetadataKey(packageKey);
      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
      
      console.log(`📋 Saving metadata for ${packageKey} to ${metadataKey}`);
      
      const result = await r2Client.uploadBlob(metadataKey, metadataBlob, {
        contentType: 'application/json'
      });
      
      if (result.success) {
        console.log(`✅ Metadata saved successfully: ${metadataKey}`);
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to save metadata');
      }
    } catch (error) {
      console.error(`❌ Failed to save metadata for ${packageKey}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save metadata'
      };
    }
  }
  
  /**
   * Fetch metadata from R2
   */
  static async fetchMetadata(packageKey: string): Promise<PackageMetadata | null> {
    try {
      const metadataKey = this.getMetadataKey(packageKey);
      console.log(`📋 Fetching metadata from ${metadataKey}`);
      
      const result = await r2Client.getObject(metadataKey);
      
      if (result.success && result.data) {
        const jsonString = new TextDecoder().decode(result.data);
        const metadata = JSON.parse(jsonString) as PackageMetadata;
        console.log(`✅ Metadata fetched successfully for ${packageKey}`);
        return metadata;
      }
      
      console.log(`⚠️ No metadata found for ${packageKey}`);
      return null;
    } catch (error) {
      console.warn(`Failed to fetch metadata for ${packageKey}:`, error);
      return null;
    }
  }
  
  /**
   * Delete metadata file from R2
   */
  static async deleteMetadata(packageKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const metadataKey = this.getMetadataKey(packageKey);
      console.log(`🗑️ Deleting metadata: ${metadataKey}`);
      
      const result = await r2Client.deleteObject(metadataKey);
      
      if (result.success) {
        console.log(`✅ Metadata deleted successfully: ${metadataKey}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to delete metadata for ${packageKey}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete metadata'
      };
    }
  }
  
  /**
   * Extract metadata from an existing ZIP file (for migration/fallback)
   */
  static async extractMetadataFromZip(
    packageKey: string,
    zipData: Uint8Array
  ): Promise<PackageMetadata | null> {
    try {
      console.log(`📦 Extracting metadata from ZIP: ${packageKey}`);
      
      const zip = new JSZip();
      await zip.loadAsync(zipData);
      
      // Extract package name from key
      const filename = packageKey.split('/').pop() || packageKey;
      const packageName = filename
        .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      // Count playlists
      const playlistFiles = Object.keys(zip.files)
        .filter(path => path.startsWith('content/playlists/') && path.endsWith('.json'));
      
      const playlists: string[] = [];
      const videoSet = new Set<string>();
      
      for (const filePath of playlistFiles) {
        const file = zip.file(filePath);
        if (file) {
          const content = await file.async('text');
          const playlistData = JSON.parse(content);
          playlists.push(playlistData.name);
          
          // Count unique videos
          playlistData.videos?.forEach((video: any) => {
            videoSet.add(video.filename);
          });
        }
      }
      
      const metadata: PackageMetadata = {
        packageName,
        filename,
        playlistCount: playlists.length,
        videoCount: videoSet.size,
        playlistNames: playlists,
        totalSize: zipData.length,
        createdAt: new Date().toISOString(), // We don't know the actual creation date
        version: this.METADATA_VERSION
      };
      
      console.log(`✅ Extracted metadata for ${packageKey}:`, metadata);
      return metadata;
    } catch (error) {
      console.error(`Failed to extract metadata from ZIP ${packageKey}:`, error);
      return null;
    }
  }
  
  /**
   * Generate and save metadata for an existing package (migration helper)
   */
  static async generateMetadataForExistingPackage(
    packageKey: string
  ): Promise<{ success: boolean; metadata?: PackageMetadata; error?: string }> {
    try {
      console.log(`🔄 Generating metadata for existing package: ${packageKey}`);
      
      // Download the package
      const result = await r2Client.getObject(packageKey);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to download package');
      }
      
      // Extract metadata from ZIP
      const metadata = await this.extractMetadataFromZip(packageKey, result.data);
      if (!metadata) {
        throw new Error('Failed to extract metadata from package');
      }
      
      // Save metadata to R2
      const saveResult = await this.saveMetadata(packageKey, metadata);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save metadata');
      }
      
      console.log(`✅ Successfully generated metadata for ${packageKey}`);
      return { success: true, metadata };
    } catch (error) {
      console.error(`Failed to generate metadata for ${packageKey}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate metadata'
      };
    }
  }
}