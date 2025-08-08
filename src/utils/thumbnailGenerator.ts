export interface ThumbnailResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  error?: string;
  width: number;
  height: number;
  aspectRatio: number; // width / height ratio for proper UI display
  videoDuration?: number; // duration in seconds extracted from video metadata
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
    targetWidth: 600, // Ultra-high resolution for crisp images
    quality: 0.98,    // Near-lossless quality
    format: 'jpeg',
    timeOffset: 1.0   // Capture at 1 second to avoid black frames
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
        
        let validDuration: number | undefined = undefined;
        
        const checkAndCaptureDuration = (eventName: string) => {
          console.log(`🔍 [ThumbnailGenerator] ${eventName} event for ${videoFile.name}:`);
          console.log(`   - Duration: ${video.duration} (type: ${typeof video.duration})`);
          console.log(`   - ReadyState: ${video.readyState}`);
          
          if (!isNaN(video.duration) && video.duration > 0 && video.duration !== Infinity) {
            validDuration = video.duration;
            console.log(`✅ [ThumbnailGenerator] Valid duration captured from ${eventName}: ${validDuration}s`);
          } else {
            console.warn(`⚠️ [ThumbnailGenerator] Invalid duration in ${eventName}: ${video.duration}`);
          }
        };
        
        video.onloadedmetadata = () => {
          console.log(`🎬 [ThumbnailGenerator] Video metadata loaded for ${videoFile.name}:`);
          console.log(`   - Dimensions: ${video.videoWidth}x${video.videoHeight}`);
          checkAndCaptureDuration('onloadedmetadata');
          
          // Wait a bit for duration to stabilize, then proceed
          setTimeout(() => {
            checkAndCaptureDuration('onloadedmetadata-delayed');
            
            // Set time to capture (but don't exceed video duration)
            const safeDuration = validDuration || video.duration || 2; // fallback to 2 seconds
            const captureTime = Math.min(opts.timeOffset, safeDuration - 0.1);
            console.log(`📍 [ThumbnailGenerator] Setting currentTime to ${captureTime}s`);
            video.currentTime = captureTime;
          }, 100); // Small delay to let duration stabilize
        };
        
        video.oncanplay = () => {
          checkAndCaptureDuration('oncanplay');
        };
        
        video.onloadeddata = () => {
          checkAndCaptureDuration('onloadeddata');
        };
        
        video.onseeked = () => {
          try {
            console.log(`📸 [ThumbnailGenerator] Video seeked to ${video.currentTime}s for ${videoFile.name}`);
            console.log(`⏱️ [ThumbnailGenerator] Final duration check: ${video.duration}s (type: ${typeof video.duration})`);
            console.log(`🎯 [ThumbnailGenerator] Using captured valid duration: ${validDuration}s`);
            
            // Use the best available duration value
            const finalDuration = validDuration || video.duration;
            
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
                height: 0,
                aspectRatio: 1,
                videoDuration: finalDuration
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
                  console.log(`✅ [ThumbnailGenerator] Success! Returning duration: ${finalDuration}s for ${videoFile.name}`);
                  resolve({
                    success: true,
                    dataUrl,
                    blob,
                    width: thumbnailWidth,
                    height: thumbnailHeight,
                    aspectRatio: thumbnailWidth / thumbnailHeight,
                    videoDuration: finalDuration
                  });
                } else {
                  console.log(`❌ [ThumbnailGenerator] Blob failed but returning duration: ${finalDuration}s for ${videoFile.name}`);
                  resolve({
                    success: false,
                    error: 'Failed to create thumbnail blob',
                    width: thumbnailWidth,
                    height: thumbnailHeight,
                    aspectRatio: thumbnailWidth / thumbnailHeight,
                    videoDuration: finalDuration
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
              height: 0,
              aspectRatio: 1,
              videoDuration: validDuration || video.duration
            });
          }
        };
        
        video.onerror = (error) => {
          console.error(`❌ [ThumbnailGenerator] Video load error for ${videoFile.name}:`, error);
          console.log(`🔍 [ThumbnailGenerator] Final duration attempt in onerror: ${validDuration || video.duration}`);
          cleanup();
          resolve({
            success: false,
            error: `Video load error: ${error}`,
            width: 0,
            height: 0,
            aspectRatio: 1,
            videoDuration: validDuration // Try to preserve any captured duration
          });
        };
        
        video.onabort = () => {
          console.warn(`⚠️ [ThumbnailGenerator] Video load aborted for ${videoFile.name}`);
          console.log(`🔍 [ThumbnailGenerator] Final duration attempt in onabort: ${validDuration || video.duration}`);
          cleanup();
          resolve({
            success: false,
            error: 'Video load aborted',
            width: 0,
            height: 0,
            aspectRatio: 1,
            videoDuration: validDuration // Try to preserve any captured duration
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
        height: 0,
        aspectRatio: 1,
        videoDuration: undefined // Error occurred before video could be loaded
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