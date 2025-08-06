export interface VideoMetadata {
  resolution: string;
  codec: string;
  bitrate: number;
}

export interface Video {
  id: string;
  title: string;
  filename: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  thumbnailUrl: string;
  tags: string[];
  dateAdded: Date;
  lastModified: Date;
  sourceUrl?: string; // optional YouTube URL
  metadata: VideoMetadata;
  r2Storage?: R2StorageInfo; // R2 storage information
}

export interface R2StorageInfo {
  key: string; // R2 object key
  bucket: string; // R2 bucket name
  etag?: string; // R2 ETag for version tracking
  publicUrl?: string; // Public URL if available
  uploadDate: Date; // When uploaded to R2
}

export interface PlaylistMetadata {
  totalDuration: number;
  videoCount: number;
  totalSize: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  videoOrder: string[];
  dateCreated: Date;
  lastModified: Date;
  tags: string[];
  metadata: PlaylistMetadata;
}

export interface PackageMetadata {
  totalSize: number;
  totalVideos: number;
  totalPlaylists: number;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  playlistIds: string[];
  individualVideoIds: string[];
  dateCreated: Date;
  lastExported?: Date;
  exportCount: number;
  metadata: PackageMetadata;
}

// Export format types
export interface VideoLibraryExport {
  video_library: {
    last_updated: string; // ISO 8601 timestamp
    total_videos: number;
    total_duration_seconds: number;
    videos: Record<string, VideoExportEntry>;
  };
}

export interface VideoExportEntry {
  title: string;
  filename: string;
  duration_seconds: number;
  duration_formatted: string; // HH:MM:SS format
  thumbnail: string; // relative path to thumbnail
  mood: 'ambient' | 'high-energy' | 'psychedelic';
  resolution: string;
  category: 'background_visuals' | 'performance_visuals' | 'ambient_visuals';
}

export interface PlaylistExport {
  name: string;
  description: string;
  mood: 'ambient' | 'high-energy' | 'psychedelic';
  loop: boolean;
  videos: PlaylistVideoEntry[];
}

export interface PlaylistVideoEntry {
  filename: string;
  title: string;
  duration_seconds: number;
  duration_formatted: string; // HH:MM:SS format
  thumbnail: string; // relative thumbnail path
}

// UI-specific types
export type ViewMode = 'playlists' | 'packages' | 'settings';

export type FilterCriteria = {
  searchTerm: string;
  tags: string[];
  durationRange: 'all' | 'under2' | '2to5' | 'over5';
  dateRange: 'all' | 'week' | 'month' | 'year';
  usageStatus: 'all' | 'unused' | 'single' | 'multiple';
};

export type SortCriteria = 'title-asc' | 'title-desc' | 'date-asc' | 'date-desc' | 'duration-asc' | 'duration-desc' | 'usage';

export interface DragItem {
  id: string;
  type: 'video' | 'playlist';
  sourceType: 'repository' | 'playlist';
  sourceId?: string; // playlist ID if source is playlist
}

// Cloud Storage Configuration Types
export interface CloudStorageConfig {
  r2: R2Config;
  enabled: boolean;
}

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region?: string;
  customDomain?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CloudStorageStatus {
  status: ConnectionStatus;
  lastTested?: Date;
  error?: string;
}

// Settings-related types
export interface AppSettings {
  cloudStorage: CloudStorageConfig;
  ui: UISettings;
  export: ExportSettings;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showThumbnails: boolean;
}

export interface ExportSettings {
  defaultFormat: 'json' | 'yaml';
  includeMetadata: boolean;
  compressionLevel: number;
}