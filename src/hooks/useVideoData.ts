import { useState, useEffect, useCallback } from 'react';
import { videoService } from '../services/videoService';
import type { Video, Playlist } from '../types';

export const useVideoData = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refresh data from service with retry logic
  const refreshData = useCallback(async (attempt = 1) => {
    const maxRetries = 3;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Refreshing video data (attempt ${attempt})`);
      
      const [videosData, playlistsData] = await Promise.all([
        videoService.getVideos(),
        Promise.resolve(videoService.getPlaylists())
      ]);
      
      setVideos(videosData);
      setPlaylists(playlistsData);
      setRetryCount(0);
      
      console.log(`Successfully loaded ${videosData.length} videos and ${playlistsData.length} playlists`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error(`Failed to refresh data (attempt ${attempt}):`, errorMessage);
      
      if (attempt < maxRetries) {
        // Exponential backoff retry
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          setRetryCount(attempt);
          refreshData(attempt + 1);
        }, delay);
      } else {
        setError(errorMessage);
        setRetryCount(maxRetries);
      }
    } finally {
      if (attempt === 1 || attempt >= maxRetries) {
        setIsLoading(false);
      }
    }
  }, []);

  // Subscribe to service updates
  useEffect(() => {
    const unsubscribe = videoService.subscribe(() => {
      console.log('VideoService notified of changes, refreshing data...');
      refreshData();
    });

    // Initial data load
    console.log('useVideoData initializing...');
    refreshData();

    return unsubscribe;
  }, [refreshData]);

  // Force refresh function that clears errors and retries
  const forceRefresh = useCallback(async () => {
    setError(null);
    setRetryCount(0);
    await refreshData();
  }, [refreshData]);

  // Video operations
  const addVideo = useCallback(async (videoData: Parameters<typeof videoService.addVideo>[0]) => {
    try {
      const video = await videoService.addVideo(videoData);
      return video;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video');
      return null;
    }
  }, []);

  const updateVideo = useCallback(async (id: string, updates: Partial<Video>) => {
    try {
      const video = await videoService.updateVideo(id, updates);
      return video;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update video');
      return null;
    }
  }, []);

  const deleteVideo = useCallback(async (id: string, forceDelete = false) => {
    try {
      const result = await videoService.deleteVideo(id, forceDelete);
      if (!result.success) {
        setError(result.error || 'Failed to delete video');
      } else if (result.error) {
        // Video was deleted locally but R2 deletion failed
        setError(result.error);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete video';
      setError(error);
      return { success: false, localDeleted: false, r2Deleted: false, error };
    }
  }, []);

  // Playlist operations
  const createPlaylist = useCallback((name: string, description?: string) => {
    try {
      const playlist = videoService.createPlaylist(name, description);
      return playlist;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
      return null;
    }
  }, []);

  const addVideoToPlaylist = useCallback(async (playlistId: string, videoId: string) => {
    try {
      const success = await videoService.addVideoToPlaylist(playlistId, videoId);
      if (!success) {
        setError('Failed to add video to playlist');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video to playlist');
      return false;
    }
  }, []);

  const removeVideoFromPlaylist = useCallback(async (playlistId: string, videoId: string) => {
    try {
      const success = await videoService.removeVideoFromPlaylist(playlistId, videoId);
      if (!success) {
        setError('Failed to remove video from playlist');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove video from playlist');
      return false;
    }
  }, []);

  const moveVideoToPlaylist = useCallback(async (sourcePlaylistId: string | null, targetPlaylistId: string, videoId: string) => {
    try {
      const success = await videoService.moveVideoToPlaylist(sourcePlaylistId, targetPlaylistId, videoId);
      if (!success) {
        setError('Failed to move video between playlists');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move video between playlists');
      return false;
    }
  }, []);

  const reorderVideosInPlaylist = useCallback((playlistId: string, activeId: string, overId: string) => {
    try {
      const success = videoService.reorderVideosInPlaylist(playlistId, activeId, overId);
      if (!success) {
        setError('Failed to reorder videos in playlist');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder videos in playlist');
      return false;
    }
  }, []);

  // R2 sync operations
  const syncWithR2 = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await videoService.syncWithR2();
      if (!result.success) {
        setError(result.error || 'Failed to sync with R2');
      }
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with R2');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVideoFromUpload = useCallback(async (uploadResult: Parameters<typeof videoService.createVideoFromUpload>[0]) => {
    try {
      const video = await videoService.createVideoFromUpload(uploadResult);
      return video;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create video from upload');
      return null;
    }
  }, []);

  // Retry R2 deletion
  const retryR2Deletion = useCallback(async (videoId: string) => {
    try {
      const result = await videoService.retryR2Deletion(videoId);
      if (!result.success) {
        setError(result.error || 'Failed to retry R2 deletion');
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to retry R2 deletion';
      setError(error);
      return { success: false, error };
    }
  }, []);

  // Get orphaned R2 videos
  const getOrphanedR2Videos = useCallback(async () => {
    return await videoService.getOrphanedR2Videos();
  }, []);

  // Get video URL
  const getVideoUrl = useCallback((video: Video) => {
    return videoService.getVideoUrl(video);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values - Repository shows ALL videos to allow multiple playlist usage
  const repositoryVideos = videos;

  return {
    // Data
    videos,
    playlists,
    repositoryVideos,
    
    // State
    isLoading,
    error,
    retryCount,
    
    // Video operations
    addVideo,
    updateVideo,
    deleteVideo,
    
    // Playlist operations
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    moveVideoToPlaylist,
    reorderVideosInPlaylist,
    
    // R2 operations
    syncWithR2,
    createVideoFromUpload,
    retryR2Deletion,
    getOrphanedR2Videos,
    getVideoUrl,
    
    // Utility
    clearError,
    refreshData,
    forceRefresh
  };
};