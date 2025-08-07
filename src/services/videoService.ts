import { v4 as uuidv4 } from 'uuid';
import { r2Client } from './r2Client';
import type { Video, Playlist, R2StorageInfo } from '../types';

const STORAGE_KEYS = {
  PLAYLISTS: 'dbtv-playlists',
  VIDEO_METADATA: 'dbtv-video-metadata'
  // R2 videos are fetched directly, but we store metadata overrides
};

export class VideoService {
  private playlists: Playlist[] = [];
  private videoMetadataOverrides: Record<string, Partial<Video>> = {};
  private listeners: Array<() => void> = [];
  private isRefreshing = false;

  constructor() {
    this.loadFromStorage();
  }

  // Event system for components to listen to data changes
  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  private saveToStorage() {
    try {
      // Save playlists to localStorage
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(this.playlists.map(playlist => ({
        ...playlist,
        dateCreated: playlist.dateCreated.toISOString(),
        lastModified: playlist.lastModified.toISOString()
      }))));
      
      // Save video metadata overrides
      localStorage.setItem(STORAGE_KEYS.VIDEO_METADATA, JSON.stringify(this.videoMetadataOverrides));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      // Load playlists from localStorage
      const playlistsData = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (playlistsData) {
        const parsedPlaylists = JSON.parse(playlistsData);
        this.playlists = parsedPlaylists.map((playlist: any) => ({
          ...playlist,
          dateCreated: new Date(playlist.dateCreated),
          lastModified: new Date(playlist.lastModified)
        }));
      }
      
      // Load video metadata overrides
      const metadataData = localStorage.getItem(STORAGE_KEYS.VIDEO_METADATA);
      if (metadataData) {
        this.videoMetadataOverrides = JSON.parse(metadataData);
        console.log('Loaded video metadata overrides for', Object.keys(this.videoMetadataOverrides).length, 'videos');
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  }

  // Video management - now fetches directly from R2
  async getVideos(): Promise<Video[]> {
    if (!r2Client.isConfigured()) {
      console.log('R2 client not configured, waiting for initialization...');
      return [];
    }

    // Prevent multiple simultaneous refreshes
    if (this.isRefreshing) {
      console.log('Already refreshing videos, skipping duplicate request');
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getVideos();
    }

    this.isRefreshing = true;

    try {
      console.log('Fetching videos from R2...');
      // Always fetch current state from R2 bucket
      const result = await r2Client.listObjects('videos/');
      
      // Convert R2 objects to Video objects
      const r2Videos = await Promise.all(
        result.objects.map(async (r2Object) => {
          return await this.createVideoFromR2Object(r2Object);
        })
      );
      
      // Filter out any failed conversions
      const validVideos = r2Videos.filter(video => video !== null) as Video[];
      
      console.log(`Successfully fetched ${validVideos.length} videos from R2`);
      return validVideos;
    } catch (error) {
      console.error('Failed to fetch videos from R2:', error);
      // Re-throw error so components can handle appropriately
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const videos = await this.getVideos();
    return videos.find(v => v.id === id);
  }

  // This method is now mainly used for creating video records during upload
  // The actual source of truth is R2, so we notify listeners to refresh
  async addVideo(videoData: {
    title: string;
    filename: string;
    duration: number;
    fileSize: number;
    tags: string[];
    metadata: Video['metadata'];
    r2Storage?: R2StorageInfo;
  }): Promise<Video> {
    const newVideo: Video = {
      id: videoData.r2Storage ? this.generateVideoIdFromR2Key(videoData.r2Storage.key) : uuidv4(),
      ...videoData,
      thumbnailUrl: '', // TODO: Generate thumbnail from R2
      dateAdded: new Date(),
      lastModified: new Date(),
      r2Storage: videoData.r2Storage
    };

    console.log('🎬 Adding new video to service:', {
      title: newVideo.title,
      r2Key: newVideo.r2Storage?.key,
      thumbnailKey: newVideo.r2Storage?.thumbnailKey,
      thumbnailUrl: newVideo.r2Storage?.thumbnailUrl
    });

    // Wait for R2 to be consistent (shorter delay since thumbnail should be uploaded already)
    setTimeout(() => {
      console.log('📺 Notifying listeners of new video upload after delay');
      this.notify();
    }, 1000);
    
    return newVideo;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    // Get current video to ensure it exists
    const videos = await this.getVideos();
    const video = videos.find(v => v.id === id);
    if (!video) return null;

    // Create the updated video
    const updatedVideo = {
      ...video,
      ...updates,
      lastModified: new Date()
    };

    // Save the metadata override to localStorage
    this.videoMetadataOverrides[id] = {
      ...(this.videoMetadataOverrides[id] || {}),
      ...updates,
      lastModified: new Date()
    };

    console.log('Saving video metadata override for:', updatedVideo.title);
    this.saveToStorage();
    this.notify();
    
    return updatedVideo;
  }

  async deleteVideo(id: string, forceDelete = false): Promise<{ success: boolean; localDeleted: boolean; r2Deleted: boolean; error?: string }> {
    // Fetch videos from R2 to find the video to delete
    const videos = await this.getVideos();
    const video = videos.find(v => v.id === id);
    if (!video) {
      return { success: false, localDeleted: false, r2Deleted: false, error: 'Video not found' };
    }

    let r2Deleted = true;
    let r2Error = '';

    // Delete from R2 if it exists there
    if (video.r2Storage) {
      if (!r2Client.isConfigured()) {
        r2Deleted = false;
        r2Error = 'R2 client not configured';
      } else {
        const result = await r2Client.deleteObject(video.r2Storage.key);
        r2Deleted = result.success;
        if (!result.success) {
          r2Error = result.error || 'R2 deletion failed';
        }
      }
    }

    // If R2 deletion failed and we're not forcing deletion, return error
    if (video.r2Storage && !r2Deleted && !forceDelete) {
      return {
        success: false,
        localDeleted: false,
        r2Deleted: false,
        error: `Failed to delete from R2 storage: ${r2Error}. File will remain in cloud storage.`
      };
    }

    // Remove from all playlists first
    const playlistUpdates = this.playlists.map(async playlist => ({
      ...playlist,
      videoIds: playlist.videoIds.filter(vid => vid !== id),
      videoOrder: playlist.videoOrder.filter(vid => vid !== id),
      lastModified: new Date(),
      metadata: await this.calculatePlaylistMetadata(playlist.videoIds.filter(vid => vid !== id))
    }));
    
    this.playlists = await Promise.all(playlistUpdates);

    // Remove any metadata override for this video
    if (this.videoMetadataOverrides[id]) {
      delete this.videoMetadataOverrides[id];
      console.log('Removed metadata override for deleted video:', id);
    }
    
    this.saveToStorage();
    this.notify();
    
    return {
      success: true,
      localDeleted: true,
      r2Deleted: r2Deleted,
      error: !r2Deleted ? `Local video deleted, but R2 file remains: ${r2Error}` : undefined
    };
  }

  // Playlist management
  getPlaylists(): Playlist[] {
    return [...this.playlists];
  }

  getPlaylist(id: string): Playlist | undefined {
    return this.playlists.find(p => p.id === id);
  }

  createPlaylist(name: string, description?: string): Playlist {
    const newPlaylist: Playlist = {
      id: uuidv4(),
      name,
      description: description || '',
      videoIds: [],
      videoOrder: [],
      dateCreated: new Date(),
      lastModified: new Date(),
      tags: [],
      metadata: {
        totalDuration: 0,
        videoCount: 0,
        totalSize: 0
      }
    };

    this.playlists.push(newPlaylist);
    this.saveToStorage();
    this.notify();
    
    return newPlaylist;
  }

  async addVideoToPlaylist(playlistId: string, videoId: string): Promise<boolean> {
    const playlist = this.playlists.find(p => p.id === playlistId);
    
    if (!playlist || playlist.videoIds.includes(videoId)) {
      return false;
    }

    // Verify video exists in R2 before adding to playlist
    try {
      const videos = await this.getVideos();
      const video = videos.find(v => v.id === videoId);
      if (!video) {
        console.warn(`Video ${videoId} not found in R2, cannot add to playlist`);
        return false;
      }
    } catch (error) {
      console.error('Failed to verify video exists in R2:', error);
      return false;
    }

    playlist.videoIds.push(videoId);
    playlist.videoOrder.push(videoId);
    playlist.lastModified = new Date();
    playlist.metadata = await this.calculatePlaylistMetadata(playlist.videoIds);

    this.saveToStorage();
    this.notify();
    
    return true;
  }

  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<boolean> {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist || !playlist.videoIds.includes(videoId)) {
      return false;
    }

    playlist.videoIds = playlist.videoIds.filter(id => id !== videoId);
    playlist.videoOrder = playlist.videoOrder.filter(id => id !== videoId);
    playlist.lastModified = new Date();
    playlist.metadata = await this.calculatePlaylistMetadata(playlist.videoIds);

    this.saveToStorage();
    this.notify();
    
    return true;
  }

  async moveVideoToPlaylist(sourcePlaylistId: string | null, targetPlaylistId: string, videoId: string): Promise<boolean> {
    const targetPlaylist = this.playlists.find(p => p.id === targetPlaylistId);
    
    if (!targetPlaylist) return false;

    // Verify video exists in R2
    try {
      const videos = await this.getVideos();
      const video = videos.find(v => v.id === videoId);
      if (!video) {
        console.warn(`Video ${videoId} not found in R2, cannot move to playlist`);
        return false;
      }
    } catch (error) {
      console.error('Failed to verify video exists in R2:', error);
      return false;
    }

    // Remove from source playlist if specified
    if (sourcePlaylistId) {
      await this.removeVideoFromPlaylist(sourcePlaylistId, videoId);
    }

    // Add to target playlist
    return await this.addVideoToPlaylist(targetPlaylistId, videoId);
  }

  reorderVideosInPlaylist(playlistId: string, activeId: string, overId: string): boolean {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) return false;

    const oldIndex = playlist.videoOrder.indexOf(activeId);
    const newIndex = playlist.videoOrder.indexOf(overId);
    
    if (oldIndex === -1 || newIndex === -1) return false;

    const newOrder = [...playlist.videoOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, activeId);
    
    playlist.videoOrder = newOrder;
    playlist.lastModified = new Date();

    this.saveToStorage();
    this.notify();
    
    return true;
  }

  private async calculatePlaylistMetadata(videoIds: string[]) {
    try {
      const allVideos = await this.getVideos();
      const videos = videoIds.map(id => allVideos.find(v => v.id === id)).filter(Boolean) as Video[];
      
      return {
        totalDuration: videos.reduce((sum, video) => sum + video.duration, 0),
        videoCount: videos.length,
        totalSize: videos.reduce((sum, video) => sum + video.fileSize, 0)
      };
    } catch (error) {
      console.error('Failed to calculate playlist metadata:', error);
      return {
        totalDuration: 0,
        videoCount: videoIds.length,
        totalSize: 0
      };
    }
  }

  // R2 Integration methods
  async syncWithR2(): Promise<{ success: boolean; error?: string }> {
    // Since getVideos() now always fetches from R2, sync is just a refresh
    try {
      await this.getVideos();
      this.notify(); // Notify listeners of updated data
      return { success: true };
    } catch (error) {
      console.error('Failed to sync with R2:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      };
    }
  }

  private async createVideoFromR2Object(r2Object: { key: string; size: number; lastModified: Date; etag: string }): Promise<Video | null> {
    try {
      // Extract metadata from R2 object key
      const filename = r2Object.key.split('/').pop() || 'unknown.mp4';
      const title = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      
      // Generate consistent ID from R2 key (hash it for uniqueness)
      const videoId = this.generateVideoIdFromR2Key(r2Object.key);
      
      // Check if thumbnail actually exists for this video and generate fresh URL
      const thumbnailKey = r2Object.key.replace('videos/', 'thumbnails/').replace(/\.[^/.]+$/, '_thumb.jpg');
      let thumbnailUrl: string | undefined = undefined;
      
      // Only set thumbnail URL if thumbnail actually exists in R2
      // IMPORTANT: Always regenerate URL using current getPublicUrl() to fix cached URL issues
      try {
        const thumbnailExists = await r2Client.objectExists(thumbnailKey);
        if (thumbnailExists) {
          thumbnailUrl = r2Client.getPublicUrl(thumbnailKey) || undefined;
          console.log(`✅ Thumbnail found for ${filename}: ${thumbnailKey} -> ${thumbnailUrl}`);
        } else {
          console.log(`⚠️ No thumbnail found for ${filename}: ${thumbnailKey}`);
        }
      } catch (error) {
        console.warn(`Could not check thumbnail existence for ${filename}:`, error);
      }

      const r2Storage: R2StorageInfo = {
        key: r2Object.key,
        bucket: r2Client.getConfig()?.bucketName || 'unknown',
        etag: r2Object.etag,
        uploadDate: r2Object.lastModified,
        thumbnailKey,
        thumbnailUrl // Always use freshly generated URL to fix cached URL issues
      };

      // Create video object directly (don't persist to localStorage)
      const baseVideo: Video = {
        id: videoId,
        title,
        filename,
        duration: 0, // TODO: Extract from video metadata
        fileSize: r2Object.size,
        thumbnailUrl: thumbnailUrl || '',
        tags: [],
        dateAdded: r2Object.lastModified,
        lastModified: r2Object.lastModified,
        r2Storage,
        metadata: {
          resolution: 'unknown',
          codec: 'unknown',
          bitrate: 0
        }
      };

      // Apply any metadata overrides from localStorage
      const override = this.videoMetadataOverrides[videoId];
      if (override) {
        console.log('Applying metadata override for video:', title);
        return {
          ...baseVideo,
          ...override,
          // Always preserve core R2 data
          id: videoId,
          filename,
          fileSize: r2Object.size,
          r2Storage,
          dateAdded: r2Object.lastModified
        };
      }

      return baseVideo;
    } catch (error) {
      console.error('Failed to create video from R2 object:', error);
      return null;
    }
  }

  // Create video from upload result
  async createVideoFromUpload(uploadResult: {
    id: string;
    file: File;
    r2Key?: string;
    thumbnailR2Key?: string;
  }): Promise<Video | null> {
    if (!uploadResult.r2Key) return null;

    const r2Storage: R2StorageInfo = {
      key: uploadResult.r2Key,
      bucket: r2Client.getConfig()?.bucketName || 'unknown',
      uploadDate: new Date(),
      thumbnailKey: uploadResult.thumbnailR2Key,
      thumbnailUrl: uploadResult.thumbnailR2Key ? (r2Client.getPublicUrl(uploadResult.thumbnailR2Key) || undefined) : undefined
    };

    // Extract basic video metadata
    const title = uploadResult.file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    
    return await this.addVideo({
      title,
      filename: uploadResult.file.name,
      duration: 0, // TODO: Extract duration from video file
      fileSize: uploadResult.file.size,
      tags: [],
      metadata: {
        resolution: 'unknown', // TODO: Extract from video
        codec: 'unknown',
        bitrate: 0
      },
      r2Storage
    });
  }

  // Retry R2 deletion for a specific video
  async retryR2Deletion(videoId: string, maxRetries = 3): Promise<{ success: boolean; error?: string }> {
    const videos = await this.getVideos();
    const video = videos.find((v: Video) => v.id === videoId);
    if (!video || !video.r2Storage) {
      return { success: false, error: 'Video not found or has no R2 storage' };
    }

    if (!r2Client.isConfigured()) {
      return { success: false, error: 'R2 client not configured' };
    }

    let lastError = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await r2Client.deleteObject(video.r2Storage.key);
        if (result.success) {
          return { success: true };
        }
        lastError = result.error || `Attempt ${attempt} failed`;
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : `Attempt ${attempt} failed`;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return { success: false, error: `Failed after ${maxRetries} attempts: ${lastError}` };
  }

  // Get videos that have R2 storage but failed deletion (orphaned)
  async getOrphanedR2Videos(): Promise<Video[]> {
    try {
      const videos = await this.getVideos();
      return videos.filter(video => 
        video.r2Storage && 
        !video.r2Storage.key.startsWith('orphaned_')
      );
    } catch (error) {
      console.error('Failed to get orphaned R2 videos:', error);
      return [];
    }
  }

  // Mark video as having orphaned R2 storage
  async markVideoAsOrphaned(videoId: string): Promise<boolean> {
    try {
      const videos = await this.getVideos();
      const video = videos.find(v => v.id === videoId);
      if (!video || !video.r2Storage) return false;

      // TODO: In a full implementation, this would update metadata in R2
      // For now, just notify listeners since R2 is source of truth
      console.warn(`Video ${videoId} marked as orphaned in R2 storage`);
      this.notify();
      
      return true;
    } catch (error) {
      console.error('Failed to mark video as orphaned:', error);
      return false;
    }
  }

  // Generate consistent video ID from R2 key
  private generateVideoIdFromR2Key(r2Key: string): string {
    // Use a simple hash of the R2 key for consistent IDs
    let hash = 0;
    for (let i = 0; i < r2Key.length; i++) {
      const char = r2Key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  // Get public URL for video
  getVideoUrl(video: Video): string | null {
    if (video.r2Storage && r2Client.isConfigured()) {
      return r2Client.getPublicUrl(video.r2Storage.key);
    }
    return null;
  }
}

// Export singleton instance
export const videoService = new VideoService();