export interface ThumbnailResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  error?: string;
  width: number;
  height: number;
}

export interface ThumbnailOptions {
  targetWidth?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
  timeOffset?: number; // seconds into video to capture
}

/**
 * Generates a thumbnail from a video file using HTML5 video and canvas
 */
export class ThumbnailGenerator {
  private static readonly DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
    targetWidth: 150,
    quality: 0.8,
    format: 'jpeg',
    timeOffset: 1.0 // Capture at 1 second to avoid black frames
  };

  /**
   * Generate a thumbnail from a video file
   */
  static async generateThumbnail(
    videoFile: File, 
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      // Create video element
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(videoFile);
      
      return new Promise<ThumbnailResult>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(videoUrl);
          video.remove();
        };
        
        video.onloadedmetadata = () => {
          console.log(`Video loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
          
          // Set time to capture (but don't exceed video duration)
          const captureTime = Math.min(opts.timeOffset, video.duration - 0.1);
          video.currentTime = captureTime;
        };
        
        video.onseeked = () => {
          try {
            console.log(`Capturing thumbnail at ${video.currentTime}s`);
            
            // Calculate thumbnail dimensions maintaining aspect ratio
            const aspectRatio = video.videoHeight / video.videoWidth;
            const thumbnailWidth = opts.targetWidth;
            const thumbnailHeight = Math.round(thumbnailWidth * aspectRatio);
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              cleanup();
              resolve({
                success: false,
                error: 'Could not get canvas context',
                width: 0,
                height: 0
              });
              return;
            }
            
            // Set canvas size
            canvas.width = thumbnailWidth;
            canvas.height = thumbnailHeight;
            
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, thumbnailWidth, thumbnailHeight);
            
            // Convert to desired format
            const mimeType = `image/${opts.format}`;
            
            // Get data URL
            const dataUrl = canvas.toDataURL(mimeType, opts.quality);
            
            // Convert to blob for upload
            canvas.toBlob(
              (blob) => {
                cleanup();
                
                if (blob) {
                  resolve({
                    success: true,
                    dataUrl,
                    blob,
                    width: thumbnailWidth,
                    height: thumbnailHeight
                  });
                } else {
                  resolve({
                    success: false,
                    error: 'Failed to create thumbnail blob',
                    width: thumbnailWidth,
                    height: thumbnailHeight
                  });
                }
              },
              mimeType,
              opts.quality
            );
            
          } catch (error) {
            cleanup();
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate thumbnail',
              width: 0,
              height: 0
            });
          }
        };
        
        video.onerror = (error) => {
          cleanup();
          resolve({
            success: false,
            error: `Video load error: ${error}`,
            width: 0,
            height: 0
          });
        };
        
        video.onabort = () => {
          cleanup();
          resolve({
            success: false,
            error: 'Video load aborted',
            width: 0,
            height: 0
          });
        };
        
        // Set video source and load
        video.src = videoUrl;
        video.load();
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        width: 0,
        height: 0
      };
    }
  }

  /**
   * Generate multiple thumbnails at different time offsets
   */
  static async generateMultipleThumbnails(
    videoFile: File,
    timeOffsets: number[],
    options: Omit<ThumbnailOptions, 'timeOffset'> = {}
  ): Promise<ThumbnailResult[]> {
    const results: ThumbnailResult[] = [];
    
    for (const timeOffset of timeOffsets) {
      const result = await this.generateThumbnail(videoFile, {
        ...options,
        timeOffset
      });
      results.push(result);
      
      // Small delay between generations to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Utility to generate a thumbnail filename based on the original video filename
   */
  static generateThumbnailFilename(videoFilename: string, format: 'jpeg' | 'png' = 'jpeg'): string {
    const nameWithoutExtension = videoFilename.replace(/\.[^/.]+$/, '');
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    return `${nameWithoutExtension}_thumb.${extension}`;
  }

  /**
   * Utility to generate R2 key for thumbnail based on video R2 key
   */
  static generateThumbnailR2Key(videoR2Key: string, format: 'jpeg' | 'png' = 'jpeg'): string {
    // Replace 'videos/' with 'thumbnails/' and change extension
    const pathWithoutExtension = videoR2Key.replace(/\.[^/.]+$/, '');
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const thumbnailKey = pathWithoutExtension.replace('videos/', 'thumbnails/') + `_thumb.${extension}`;
    return thumbnailKey;
  }
}

// Export default instance for convenience
export const thumbnailGenerator = ThumbnailGenerator;