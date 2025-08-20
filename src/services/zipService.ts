import JSZip from 'jszip';
import type { Video, Playlist } from '../types';
import { ExportService } from './exportService';
import { r2Client } from './r2Client';
import { PackageMetadataService } from './packageMetadataService';

export class ZipService {
  
  /**
   * Downloads a file as blob from R2 with multiple fallback methods
   */
  private static async fetchVideoAsBlob(video: Video): Promise<Blob> {
    const filename = video.filename;
    console.log(`🎬 Attempting to download video: ${filename}`);

    // Method 1: Try public URL if available
    if (video.r2Storage?.publicUrl) {
      console.log(`📡 Method 1: Trying public URL for ${filename}: ${video.r2Storage.publicUrl}`);
      try {
        const response = await fetch(video.r2Storage.publicUrl);
        console.log(`📡 Public URL response for ${filename}:`, {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        
        if (!response.ok) {
          throw new Error(`Public URL fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log(`✅ Successfully downloaded ${filename} via public URL: ${blob.size} bytes`);
        
        // Validate that we got a proper video file, not an error page
        if (blob.size < 1000) {
          console.warn(`⚠️ Blob size suspiciously small (${blob.size} bytes), may be an error response`);
          throw new Error(`File too small: ${blob.size} bytes`);
        }
        
        return blob;
      } catch (error) {
        console.warn(`❌ Public URL method failed for ${filename}:`, error);
      }
    }

    // Method 2: Try direct R2 download using AWS SDK
    if (video.r2Storage?.key && r2Client.isConfigured()) {
      console.log(`🔧 Method 2: Trying direct R2 download for ${filename}: ${video.r2Storage.key}`);
      try {
        const result = await r2Client.getObject(video.r2Storage.key);
        if (result.success && result.data) {
          console.log(`✅ Successfully downloaded ${filename} via R2 SDK: ${result.data.length} bytes`);
          return new Blob([result.data], { type: 'video/mp4' });
        } else {
          throw new Error(result.error || 'Failed to get object from R2');
        }
      } catch (error) {
        console.warn(`❌ R2 SDK method failed for ${filename}:`, error);
      }
    }

    // If all methods failed
    throw new Error(`All download methods failed for ${filename}`);
  }

  /**
   * Downloads a thumbnail as blob with multiple fallback methods (similar to video fetching)
   */
  private static async fetchThumbnailAsBlob(video: Video): Promise<Blob> {
    const thumbnailKey = video.r2Storage?.thumbnailKey;
    const thumbnailUrl = video.r2Storage?.thumbnailUrl;
    const filename = video.filename;
    
    console.log(`🖼️ Attempting to download thumbnail for: ${filename}`);

    // Method 1: Try direct R2 download using AWS SDK (avoids CORS)
    if (thumbnailKey && r2Client.isConfigured()) {
      console.log(`🔧 Method 1: Trying direct R2 download for thumbnail: ${thumbnailKey}`);
      try {
        const result = await r2Client.getObject(thumbnailKey);
        if (result.success && result.data) {
          console.log(`✅ Successfully downloaded thumbnail via R2 SDK: ${result.data.length} bytes`);
          return new Blob([result.data], { type: 'image/jpeg' });
        } else {
          throw new Error(result.error || 'Failed to get thumbnail from R2');
        }
      } catch (error) {
        console.warn(`❌ R2 SDK method failed for thumbnail:`, error);
      }
    }

    // Method 2: Try public URL if available (may fail due to CORS)
    if (thumbnailUrl) {
      console.log(`📡 Method 2: Trying public URL for thumbnail: ${thumbnailUrl}`);
      try {
        const response = await fetch(thumbnailUrl);
        console.log(`📡 Public URL response for thumbnail:`, {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        });
        
        if (!response.ok) {
          throw new Error(`Public URL fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log(`✅ Successfully downloaded thumbnail via public URL: ${blob.size} bytes`);
        
        // Validate that we got a proper image file
        if (blob.size < 100) {
          console.warn(`⚠️ Thumbnail suspiciously small (${blob.size} bytes), may be invalid`);
          throw new Error(`Thumbnail too small: ${blob.size} bytes`);
        }
        
        return blob;
      } catch (error) {
        console.warn(`❌ Public URL method failed for thumbnail:`, error);
      }
    }

    // If all methods failed
    throw new Error(`All download methods failed for thumbnail of ${filename}`);
  }

  /**
   * Generates filename for thumbnail based on video filename
   */
  private static getThumbnailFilename(videoFilename: string): string {
    return videoFilename.replace(/\.[^/.]+$/, '.jpg');
  }

  /**
   * Creates a complete DBTV content package ZIP file
   */
  static async generateContentPackageZip(
    packageName: string,
    videos: Video[],
    playlists: Playlist[],
    onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void
  ): Promise<Blob> {
    const zip = new JSZip();

    // Generate the export package structure
    const exportPackage = ExportService.generateExportPackage(
      packageName,
      videos,
      playlists
    );

    // Validate the package
    const validationErrors = ExportService.validateExportPackage(exportPackage);
    if (validationErrors.length > 0) {
      throw new Error(`Export validation failed: ${validationErrors.join(', ')}`);
    }

    // Create directory structure
    const contentDir = zip.folder('content');
    if (!contentDir) throw new Error('Failed to create content directory');
    
    const packagesDir = contentDir.folder('packages');
    if (!packagesDir) throw new Error('Failed to create packages directory');
    
    const playlistsDir = contentDir.folder('playlists');
    if (!playlistsDir) throw new Error('Failed to create playlists directory');
    
    const thumbnailsDir = packagesDir.folder('thumbnails');
    if (!thumbnailsDir) throw new Error('Failed to create thumbnails directory');

    let completedFiles = 0;
    const totalFiles = videos.length * 2 + Object.keys(exportPackage.playlists).length + 1; // videos + thumbnails + playlists + metadata

    // Add master metadata.json
    packagesDir.file('metadata.json', JSON.stringify(exportPackage.metadata, null, 2));
    completedFiles++;
    onProgress?.({ completed: completedFiles, total: totalFiles, currentFile: 'metadata.json' });

    // Add playlist JSON files
    for (const [filename, playlistData] of Object.entries(exportPackage.playlists)) {
      playlistsDir.file(filename, JSON.stringify(playlistData, null, 2));
      completedFiles++;
      onProgress?.({ completed: completedFiles, total: totalFiles, currentFile: filename });
    }

    // Add video files and thumbnails
    for (const video of videos) {
      // Add video file using enhanced download method
      try {
        onProgress?.({ completed: completedFiles, total: totalFiles, currentFile: video.filename });
        console.log(`🎥 Processing video file: ${video.filename}`);
        
        const videoBlob = await this.fetchVideoAsBlob(video);
        packagesDir.file(video.filename, videoBlob);
        console.log(`✅ Added ${video.filename} to ZIP: ${videoBlob.size} bytes`);
        completedFiles++;
      } catch (error) {
        console.error(`❌ Failed to fetch video ${video.filename}:`, error);
        // Create a placeholder file to maintain package structure
        const placeholderContent = `# Placeholder for ${video.filename}\n# Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        packagesDir.file(video.filename, placeholderContent);
        completedFiles++;
      }

      // Add thumbnail file
      const thumbnailFilename = this.getThumbnailFilename(video.filename);
      if (video.r2Storage?.thumbnailUrl || video.r2Storage?.thumbnailKey) {
        try {
          onProgress?.({ completed: completedFiles, total: totalFiles, currentFile: thumbnailFilename });
          const thumbnailBlob = await this.fetchThumbnailAsBlob(video);
          thumbnailsDir.file(thumbnailFilename, thumbnailBlob);
          console.log(`✅ Added thumbnail ${thumbnailFilename}: ${thumbnailBlob.size} bytes`);
          completedFiles++;
        } catch (error) {
          console.warn(`Failed to fetch thumbnail for ${video.filename}:`, error);
          // Create a placeholder thumbnail
          thumbnailsDir.file(thumbnailFilename, `# Placeholder thumbnail for ${video.filename}`);
          completedFiles++;
        }
      } else {
        console.warn(`No thumbnail URL or key for video: ${video.filename}`);
        thumbnailsDir.file(thumbnailFilename, `# Placeholder thumbnail for ${video.filename}`);
        completedFiles++;
      }
    }

    // Generate the ZIP file
    onProgress?.({ completed: completedFiles, total: totalFiles, currentFile: 'Generating ZIP...' });
    
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Balance between compression and speed
      }
    });

    return zipBlob;
  }

  /**
   * Triggers download of the ZIP file
   */
  static downloadZipFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate R2 storage key for playlist package
   */
  private static generateR2Key(packageName: string): string {
    const cleanName = packageName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]; // YYYY-MM-DDTHH-MM-SS
    return `playlists/${cleanName}-${timestamp}-dbtv-package.zip`;
  }

  /**
   * Save package to R2 storage only (no download)
   */
  static async savePackageToR2(
    packageName: string,
    videos: Video[],
    playlists: Playlist[],
    onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void
  ): Promise<{ success: boolean; r2Key?: string; publicUrl?: string; error?: string }> {
    try {
      // Generate ZIP
      onProgress?.({ completed: 0, total: 100, currentFile: 'Generating package...' });
      const zipBlob = await this.generateContentPackageZip(
        packageName,
        videos,
        playlists,
        (progress) => {
          // Scale progress to 0-80% for ZIP generation
          const scaledProgress = {
            ...progress,
            completed: Math.floor((progress.completed / progress.total) * 80)
          };
          onProgress?.(scaledProgress);
        }
      );

      // Upload to R2
      if (!r2Client.isConfigured()) {
        console.error('R2 client not configured. Please check your R2 settings in the Settings tab.');
        throw new Error('R2 storage is not configured. Please configure R2 settings first.');
      }

      const r2Key = this.generateR2Key(packageName);
      console.log(`🚀 Starting R2 upload for key: ${r2Key}`);
      console.log(`📊 Package size: ${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB`);
      
      onProgress?.({ completed: 80, total: 100, currentFile: 'Uploading to R2 storage...' });

      const uploadResult = await r2Client.uploadBlob(r2Key, zipBlob, {
        contentType: 'application/zip',
        metadata: {
          packageName,
          createdAt: new Date().toISOString(),
          videoCount: videos.length.toString(),
          playlistCount: playlists.length.toString()
        }
      });

      if (!uploadResult.success) {
        console.error('R2 upload failed with error:', uploadResult.error);
        throw new Error(uploadResult.error || 'Failed to upload to R2');
      }

      // Save metadata as separate file for fast access
      onProgress?.({ completed: 90, total: 100, currentFile: 'Saving metadata...' });
      
      const filename = r2Key.split('/').pop() || r2Key;
      const metadata = PackageMetadataService.generateMetadata(
        packageName,
        filename,
        playlists,
        videos,
        zipBlob.size
      );
      
      const metadataResult = await PackageMetadataService.saveMetadata(r2Key, metadata);
      if (!metadataResult.success) {
        console.warn('Failed to save metadata file:', metadataResult.error);
        // Don't fail the whole operation if metadata save fails
      }

      onProgress?.({ completed: 100, total: 100, currentFile: 'Package saved to R2!' });

      console.log(`🎉 Package successfully saved to R2: ${r2Key}`);
      return {
        success: true,
        r2Key,
        publicUrl: uploadResult.publicUrl
      };

    } catch (error) {
      console.error('Save to R2 failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Complete export workflow: save to R2 and trigger download
   */
  static async exportPackageWithR2(
    packageName: string,
    videos: Video[],
    playlists: Playlist[],
    onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void
  ): Promise<{ success: boolean; r2Key?: string; publicUrl?: string; error?: string }> {
    try {
      // Generate ZIP
      onProgress?.({ completed: 0, total: 100, currentFile: 'Generating package...' });
      const zipBlob = await this.generateContentPackageZip(
        packageName,
        videos,
        playlists,
        (progress) => {
          // Scale progress to 0-70% for ZIP generation
          const scaledProgress = {
            ...progress,
            completed: Math.floor((progress.completed / progress.total) * 70)
          };
          onProgress?.(scaledProgress);
        }
      );

      // Upload to R2 (if configured)
      let r2Result: { success: boolean; r2Key?: string; publicUrl?: string; error?: string } = { success: false };
      
      if (r2Client.isConfigured()) {
        const r2Key = this.generateR2Key(packageName);
        onProgress?.({ completed: 70, total: 100, currentFile: 'Uploading to R2 storage...' });

        const uploadResult = await r2Client.uploadBlob(r2Key, zipBlob, {
          contentType: 'application/zip',
          metadata: {
            packageName,
            createdAt: new Date().toISOString(),
            videoCount: videos.length.toString(),
            playlistCount: playlists.length.toString()
          }
        });

        if (uploadResult.success) {
          console.log(`🎉 Package successfully saved to R2: ${r2Key}`);
          r2Result = {
            success: true,
            r2Key,
            publicUrl: uploadResult.publicUrl
          };
        } else {
          console.warn('R2 upload failed, continuing with download:', uploadResult.error);
          r2Result = {
            success: false,
            error: uploadResult.error
          };
        }
      } else {
        console.log('R2 not configured, skipping R2 upload');
      }

      // Always trigger download regardless of R2 upload result
      onProgress?.({ completed: 90, total: 100, currentFile: 'Starting download...' });
      const filename = `${packageName.replace(/[^a-zA-Z0-9-_]/g, '_')}-dbtv-package.zip`;
      this.downloadZipFile(zipBlob, filename);

      onProgress?.({ completed: 100, total: 100, currentFile: 'Export completed!' });
      
      return r2Result;

    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Legacy export workflow: generate ZIP and trigger download only (no R2)
   */
  static async exportAndDownload(
    packageName: string,
    videos: Video[],
    playlists: Playlist[],
    onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void
  ): Promise<void> {
    try {
      const zipBlob = await this.generateContentPackageZip(
        packageName,
        videos,
        playlists,
        onProgress
      );
      
      const filename = `${packageName.replace(/[^a-zA-Z0-9-_]/g, '_')}-dbtv-package.zip`;
      this.downloadZipFile(zipBlob, filename);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Estimates the size of the export package
   */
  static estimatePackageSize(videos: Video[]): number {
    // Estimate based on video file sizes plus some overhead for metadata/thumbnails
    const videoSize = videos.reduce((sum, video) => sum + video.fileSize, 0);
    const overhead = videos.length * 50 * 1024; // ~50KB per video for thumbnail and metadata overhead
    return videoSize + overhead;
  }
}