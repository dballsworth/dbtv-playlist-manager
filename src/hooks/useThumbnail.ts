import { useState, useEffect, useCallback } from 'react';
import { ThumbnailGenerator } from '../utils/thumbnailGenerator';
import { r2Client } from '../services/r2Client';
import type { Video } from '../types';

// Cache for generated thumbnail data URLs to avoid regenerating them
const thumbnailCache = new Map<string, string>();

interface ThumbnailState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useThumbnail = (video: Video) => {
  const [state, setState] = useState<ThumbnailState>({
    dataUrl: null,
    isLoading: false,
    error: null
  });

  const generateThumbnailFromR2 = useCallback(async (video: Video): Promise<string | null> => {
    if (!video.r2Storage?.key) {
      return null;
    }

    // Check cache first
    const cacheKey = video.r2Storage.key;
    if (thumbnailCache.has(cacheKey)) {
      console.log(`📋 Using cached thumbnail for ${video.title}`);
      return thumbnailCache.get(cacheKey)!;
    }

    try {
      console.log(`🎬 Generating thumbnail from R2 video: ${video.title}`);
      
      // Get video URL from R2
      const videoUrl = r2Client.getPublicUrl(video.r2Storage.key);
      if (!videoUrl) {
        throw new Error('Could not get video URL from R2');
      }

      // Fetch the video file
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }

      const videoBlob = await response.blob();
      
      // Create a File object from the blob for ThumbnailGenerator
      const videoFile = new File([videoBlob], video.filename, { type: videoBlob.type || 'video/mp4' });
      
      // Generate thumbnail using the same method as upload dialog
      const result = await ThumbnailGenerator.generateThumbnail(videoFile, {
        targetWidth: 150,
        quality: 0.8,
        format: 'jpeg'
      });

      if (result.success && result.dataUrl) {
        // Cache the result
        thumbnailCache.set(cacheKey, result.dataUrl);
        console.log(`✅ Generated and cached thumbnail for ${video.title}`);
        return result.dataUrl;
      } else {
        throw new Error(result.error || 'Failed to generate thumbnail');
      }
    } catch (error) {
      console.error(`❌ Failed to generate thumbnail for ${video.title}:`, error);
      return null;
    }
  }, []);

  const loadThumbnail = useCallback(async () => {
    // Priority 1: Check if we already have a generated thumbnail in cache
    const cacheKey = video.r2Storage?.key;
    if (cacheKey && thumbnailCache.has(cacheKey)) {
      setState({
        dataUrl: thumbnailCache.get(cacheKey)!,
        isLoading: false,
        error: null
      });
      return;
    }

    // Priority 2: Try R2 thumbnail URL (if it works)
    if (video.r2Storage?.thumbnailUrl) {
      try {
        const response = await fetch(video.r2Storage.thumbnailUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Using R2 thumbnail URL for ${video.title}`);
          setState({
            dataUrl: video.r2Storage.thumbnailUrl,
            isLoading: false,
            error: null
          });
          return;
        }
      } catch (error) {
        console.log(`⚠️ R2 thumbnail URL failed for ${video.title}, will generate client-side`);
      }
    }

    // Priority 3: Generate thumbnail from video file
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const dataUrl = await generateThumbnailFromR2(video);
    
    if (dataUrl) {
      setState({
        dataUrl,
        isLoading: false,
        error: null
      });
    } else {
      setState({
        dataUrl: null,
        isLoading: false,
        error: 'Failed to generate thumbnail'
      });
    }
  }, [video, generateThumbnailFromR2]);

  // Load thumbnail on mount or when video changes
  useEffect(() => {
    loadThumbnail();
  }, [loadThumbnail]);

  return {
    ...state,
    reload: loadThumbnail
  };
};

// Utility function to clear thumbnail cache (useful for testing)
export const clearThumbnailCache = () => {
  thumbnailCache.clear();
  console.log('🗑️ Thumbnail cache cleared');
};