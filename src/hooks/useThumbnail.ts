import { useState, useEffect, useCallback } from 'react';
import { ThumbnailGenerator } from '../utils/thumbnailGenerator';
import { r2Client } from '../services/r2Client';
import type { Video } from '../types';

// Cache for generated thumbnail data URLs and aspect ratios to avoid regenerating them
const thumbnailCache = new Map<string, { dataUrl: string; aspectRatio: number }>();

interface ThumbnailState {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
  aspectRatio: number | null;
}

export const useThumbnail = (video: Video) => {
  const [state, setState] = useState<ThumbnailState>({
    dataUrl: null,
    isLoading: false,
    error: null,
    aspectRatio: null
  });

  const generateThumbnailFromR2 = useCallback(async (video: Video): Promise<{ dataUrl: string; aspectRatio: number } | null> => {
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
      
      // Generate thumbnail using ultra-high-quality settings
      const result = await ThumbnailGenerator.generateThumbnail(videoFile, {
        targetWidth: 600,
        quality: 0.98,
        format: 'jpeg'
      });

      if (result.success && result.dataUrl) {
        // Cache the result with aspect ratio
        const thumbnailData = { dataUrl: result.dataUrl, aspectRatio: result.aspectRatio };
        thumbnailCache.set(cacheKey, thumbnailData);
        console.log(`✅ Generated and cached thumbnail for ${video.title} (aspect ratio: ${result.aspectRatio})`);
        return thumbnailData;
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
      const cached = thumbnailCache.get(cacheKey)!;
      setState({
        dataUrl: cached.dataUrl,
        isLoading: false,
        error: null,
        aspectRatio: cached.aspectRatio
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
            error: null,
            aspectRatio: 16/9 // Default aspect ratio for R2 thumbnails since we don't know the actual ratio
          });
          return;
        }
      } catch (error) {
        console.log(`⚠️ R2 thumbnail URL failed for ${video.title}, will generate client-side`);
      }
    }

    // Priority 3: Generate thumbnail from video file
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const thumbnailData = await generateThumbnailFromR2(video);
    
    if (thumbnailData) {
      setState({
        dataUrl: thumbnailData.dataUrl,
        isLoading: false,
        error: null,
        aspectRatio: thumbnailData.aspectRatio
      });
    } else {
      setState({
        dataUrl: null,
        isLoading: false,
        error: 'Failed to generate thumbnail',
        aspectRatio: null
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