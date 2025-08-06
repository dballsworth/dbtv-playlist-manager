import { v4 as uuidv4 } from 'uuid';
import { r2Client } from './r2Client';
import type { Video, Playlist, R2StorageInfo } from '../types';

const STORAGE_KEYS = {
  PLAYLISTS: 'dbtv-playlists'
  // Removed VIDEOS - now fetched directly from R2
};

export class VideoService {
  private videos: Video[] = [];
  private playlists: Playlist[] = [];
  private listeners: Array<() => void> = [];

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
      // Only save playlists to localStorage - videos are fetched from R2
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(this.playlists.map(playlist => ({
        ...playlist,
        dateCreated: playlist.dateCreated.toISOString(),
        lastModified: playlist.lastModified.toISOString()
      }))));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      // Only load playlists from localStorage - videos are fetched from R2
      const playlistsData = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (playlistsData) {
        const parsedPlaylists = JSON.parse(playlistsData);
        this.playlists = parsedPlaylists.map((playlist: any) => ({
          ...playlist,
          dateCreated: new Date(playlist.dateCreated),
          lastModified: new Date(playlist.lastModified)
        }));
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  }

  // Video management - now fetches directly from R2
  async getVideos(): Promise<Video[]> {
    if (!r2Client.isConfigured()) {
      // Return empty array if R2 not configured
      return [];
    }

    try {
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
      
      // Update local cache for performance
      this.videos = validVideos;
      
      return [...validVideos];
    } catch (error) {
      console.error('Failed to fetch videos from R2:', error);
      // Fallback to cached videos if R2 fetch fails
      return [...this.videos];
    }
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const videos = await this.getVideos();
    return videos.find(v => v.id === id);
  }

  // This method is now mainly used for creating video records during upload
  // The actual source of truth is R2, so we just notify listeners to refresh
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

    // Don't persist to localStorage - R2 is source of truth
    // Just notify listeners to refresh from R2
    this.notify();
    
    return newVideo;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    const index = this.videos.findIndex(v => v.id === id);
    if (index === -1) return null;

    this.videos[index] = {
      ...this.videos[index],
      ...updates,
      lastModified: new Date()
    };

    this.saveToStorage();
    this.notify();
    
    return this.videos[index];
  }

  async deleteVideo(id: string, forceDelete = false): Promise<{ success: boolean; localDeleted: boolean; r2Deleted: boolean; error?: string }> {
    const video = this.videos.find(v => v.id === id);
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
    this.playlists = this.playlists.map(playlist => ({
      ...playlist,
      videoIds: playlist.videoIds.filter(vid => vid !== id),
      videoOrder: playlist.videoOrder.filter(vid => vid !== id),
      lastModified: new Date(),
      metadata: this.calculatePlaylistMetadata(playlist.videoIds.filter(vid => vid !== id))
    }));

    // Remove video
    this.videos = this.videos.filter(v => v.id !== id);
    
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

  addVideoToPlaylist(playlistId: string, videoId: string): boolean {
    const playlist = this.playlists.find(p => p.id === playlistId);
    const video = this.videos.find(v => v.id === videoId);
    
    if (!playlist || !video || playlist.videoIds.includes(videoId)) {
      return false;
    }

    playlist.videoIds.push(videoId);
    playlist.videoOrder.push(videoId);
    playlist.lastModified = new Date();
    playlist.metadata = this.calculatePlaylistMetadata(playlist.videoIds);

    this.saveToStorage();
    this.notify();
    
    return true;
  }

  removeVideoFromPlaylist(playlistId: string, videoId: string): boolean {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist || !playlist.videoIds.includes(videoId)) {
      return false;
    }

    playlist.videoIds = playlist.videoIds.filter(id => id !== videoId);
    playlist.videoOrder = playlist.videoOrder.filter(id => id !== videoId);
    playlist.lastModified = new Date();
    playlist.metadata = this.calculatePlaylistMetadata(playlist.videoIds);

    this.saveToStorage();
    this.notify();
    
    return true;
  }

  moveVideoToPlaylist(sourcePlaylistId: string | null, targetPlaylistId: string, videoId: string): boolean {
    const targetPlaylist = this.playlists.find(p => p.id === targetPlaylistId);
    const video = this.videos.find(v => v.id === videoId);
    
    if (!targetPlaylist || !video) return false;

    // Remove from source playlist if specified
    if (sourcePlaylistId) {
      this.removeVideoFromPlaylist(sourcePlaylistId, videoId);
    }

    // Add to target playlist
    return this.addVideoToPlaylist(targetPlaylistId, videoId);
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

  private calculatePlaylistMetadata(videoIds: string[]) {
    const videos = videoIds.map(id => this.videos.find(v => v.id === id)).filter(Boolean) as Video[];
    
    return {
      totalDuration: videos.reduce((sum, video) => sum + video.duration, 0),
      videoCount: videos.length,
      totalSize: videos.reduce((sum, video) => sum + video.fileSize, 0)
    };
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
      
      const r2Storage: R2StorageInfo = {
        key: r2Object.key,
        bucket: r2Client.getConfig()?.bucketName || 'unknown',
        etag: r2Object.etag,
        uploadDate: r2Object.lastModified
      };

      // Create video object directly (don't persist to localStorage)
      const video: Video = {
        id: videoId,
        title,
        filename,
        duration: 0, // TODO: Extract from video metadata
        fileSize: r2Object.size,
        thumbnailUrl: '',
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

      return video;
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
  }): Promise<Video | null> {
    if (!uploadResult.r2Key) return null;

    const r2Storage: R2StorageInfo = {
      key: uploadResult.r2Key,
      bucket: r2Client.getConfig()?.bucketName || 'unknown',
      uploadDate: new Date()
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
    const video = this.videos.find(v => v.id === videoId);
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
  getOrphanedR2Videos(): Video[] {
    return this.videos.filter(video => 
      video.r2Storage && 
      !video.r2Storage.key.startsWith('orphaned_')
    );
  }

  // Mark video as having orphaned R2 storage
  markVideoAsOrphaned(videoId: string): boolean {
    const video = this.videos.find(v => v.id === videoId);
    if (!video || !video.r2Storage) return false;

    video.r2Storage.key = `orphaned_${video.r2Storage.key}`;
    video.lastModified = new Date();
    
    this.saveToStorage();
    this.notify();
    
    return true;
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