/**
 * Fallback utility for extracting video duration when thumbnail generation fails
 * This provides a lightweight way to get just the duration without generating a thumbnail
 */
export class DurationExtractor {
  /**
   * Extract duration from video file without generating thumbnail
   */
  static async extractDuration(videoFile: File): Promise<number | undefined> {
    try {
      // Create video element
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(videoFile);
      
      return new Promise<number | undefined>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(videoUrl);
          video.remove();
        };
        
        video.onloadedmetadata = () => {
          console.log(`Duration extracted: ${video.duration}s for ${videoFile.name}`);
          cleanup();
          resolve(video.duration);
        };
        
        video.onerror = (error) => {
          console.error(`Failed to extract duration from ${videoFile.name}:`, error);
          cleanup();
          resolve(undefined);
        };
        
        video.onabort = () => {
          console.warn(`Duration extraction aborted for ${videoFile.name}`);
          cleanup();
          resolve(undefined);
        };
        
        // Set video source and load
        video.src = videoUrl;
        video.load();
      });
      
    } catch (error) {
      console.error(`Error extracting duration from ${videoFile.name}:`, error);
      return undefined;
    }
  }
}