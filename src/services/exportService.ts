import type { Video, Playlist, VideoLibraryExport, VideoExportEntry, PlaylistExport, PlaylistVideoEntry } from '../types';

export class ExportService {
  
  /**
   * Validates playlist integrity and returns missing video IDs
   */
  static validatePlaylistIntegrity(playlist: Playlist, videos: Video[]): {
    isValid: boolean;
    missingVideoIds: string[];
    validVideoIds: string[];
  } {
    const videoIdSet = new Set(videos.map(v => v.id));
    const missingVideoIds: string[] = [];
    const validVideoIds: string[] = [];

    playlist.videoOrder.forEach(videoId => {
      if (videoIdSet.has(videoId)) {
        validVideoIds.push(videoId);
      } else {
        missingVideoIds.push(videoId);
      }
    });

    return {
      isValid: missingVideoIds.length === 0,
      missingVideoIds,
      validVideoIds
    };
  }

  /**
   * Cleans playlist data by removing references to missing videos
   */
  static cleanPlaylistData(playlist: Playlist, videos: Video[]): Playlist {
    const validation = this.validatePlaylistIntegrity(playlist, videos);
    
    if (validation.isValid) {
      return playlist;
    }

    return {
      ...playlist,
      videoIds: validation.validVideoIds,
      videoOrder: validation.validVideoIds,
      metadata: {
        ...playlist.metadata,
        videoCount: validation.validVideoIds.length
      }
    };
  }

  /**
   * Generates mood/category from playlist name
   */
  static getMoodFromPlaylistName(playlistName: string): 'ambient' | 'high-energy' | 'psychedelic' {
    const name = playlistName.toLowerCase();
    if (name.includes('high') && name.includes('energy')) return 'high-energy';
    if (name.includes('psychedelic')) return 'psychedelic';
    return 'ambient'; // default
  }

  static getCategoryFromPlaylistName(playlistName: string): 'background_visuals' | 'performance_visuals' | 'ambient_visuals' {
    const name = playlistName.toLowerCase();
    if (name.includes('performance') || name.includes('energy')) return 'performance_visuals';
    if (name.includes('psychedelic')) return 'performance_visuals';
    return 'background_visuals'; // default
  }

  /**
   * Generates DBTV-compatible metadata.json file content
   */
  static generateMetadataJson(
    videos: Video[], 
    playlists: Playlist[]
  ): VideoLibraryExport {
    const videoEntries: Record<string, VideoExportEntry> = {};
    let totalDurationSeconds = 0;

    videos.forEach(video => {
      // Find which playlist(s) contain this video and use the first one's name for metadata
      const containingPlaylist = playlists.find(p => p.videoIds.includes(video.id));
      const mood = containingPlaylist ? this.getMoodFromPlaylistName(containingPlaylist.name) : 'ambient';
      const category = containingPlaylist ? this.getCategoryFromPlaylistName(containingPlaylist.name) : 'background_visuals';
      
      // Format duration as HH:MM:SS
      const hours = Math.floor(video.duration / 3600);
      const minutes = Math.floor((video.duration % 3600) / 60);
      const seconds = Math.floor(video.duration % 60);
      const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      totalDurationSeconds += video.duration;
      
      videoEntries[video.filename] = {
        title: video.title,
        filename: video.filename,
        duration_seconds: Math.floor(video.duration),
        duration_formatted: durationFormatted,
        thumbnail: `thumbnails/${video.filename.replace(/\.[^/.]+$/, '.jpg')}`, // Replace extension with .jpg
        mood,
        resolution: video.metadata?.resolution || '1920x1080',
        category
      };
    });

    return {
      video_library: {
        last_updated: new Date().toISOString(),
        total_videos: videos.length,
        total_duration_seconds: Math.floor(totalDurationSeconds),
        videos: videoEntries
      }
    };
  }

  /**
   * Generates DBTV-compatible playlist JSON content
   */
  static generatePlaylistJson(
    playlist: Playlist,
    videos: Video[]
  ): PlaylistExport {
    // Clean playlist data to remove missing video references
    const cleanPlaylist = this.cleanPlaylistData(playlist, videos);
    
    const playlistVideos: PlaylistVideoEntry[] = cleanPlaylist.videoOrder.map(videoId => {
      const video = videos.find(v => v.id === videoId);
      if (!video) {
        // This should not happen after cleaning, but adding safety check
        console.warn(`Video with ID ${videoId} not found during export - skipping`);
        return null;
      }

      // Format duration as HH:MM:SS
      const hours = Math.floor(video.duration / 3600);
      const minutes = Math.floor((video.duration % 3600) / 60);
      const seconds = Math.floor(video.duration % 60);
      const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      return {
        filename: video.filename,
        title: video.title,
        duration_seconds: Math.floor(video.duration),
        duration_formatted: durationFormatted,
        thumbnail: `thumbnails/${video.filename.replace(/\.[^/.]+$/, '.jpg')}`
      };
    }).filter(Boolean) as PlaylistVideoEntry[]; // Remove null entries

    // Use playlist name for mood
    const playlistMood = this.getMoodFromPlaylistName(cleanPlaylist.name);

    return {
      name: cleanPlaylist.name,
      description: cleanPlaylist.name, // Use playlist name as description per user request
      mood: playlistMood,
      loop: true, // Default to true for DBTV compatibility
      videos: playlistVideos
    };
  }

  /**
   * Generates a default playlist from all selected videos
   */
  static generateDefaultPlaylist(
    videos: Video[]
  ): PlaylistExport {
    const playlistVideos: PlaylistVideoEntry[] = videos.map(video => {
      // Format duration as HH:MM:SS
      const hours = Math.floor(video.duration / 3600);
      const minutes = Math.floor((video.duration % 3600) / 60);
      const seconds = Math.floor(video.duration % 60);
      const durationFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      return {
        filename: video.filename,
        title: video.title,
        duration_seconds: Math.floor(video.duration),
        duration_formatted: durationFormatted,
        thumbnail: `thumbnails/${video.filename.replace(/\.[^/.]+$/, '.jpg')}`
      };
    });

    // Default to ambient for default playlist
    const defaultMood: 'ambient' | 'high-energy' | 'psychedelic' = 'ambient';

    return {
      name: 'Default Playlist',
      description: 'Default Playlist', // Use name as description
      mood: defaultMood,
      loop: true,
      videos: playlistVideos
    };
  }

  /**
   * Generates the complete export package structure
   */
  static generateExportPackage(
    packageName: string,
    videos: Video[],
    playlists: Playlist[]
  ) {
    // Validate and clean playlist data before export
    const cleanedPlaylists: Playlist[] = [];
    const validationIssues: string[] = [];

    playlists.forEach(playlist => {
      const validation = this.validatePlaylistIntegrity(playlist, videos);
      
      if (!validation.isValid) {
        console.warn(`Playlist "${playlist.name}" has missing videos:`, validation.missingVideoIds);
        validationIssues.push(
          `Playlist "${playlist.name}" references ${validation.missingVideoIds.length} missing videos (IDs: ${validation.missingVideoIds.slice(0, 3).join(', ')}${validation.missingVideoIds.length > 3 ? '...' : ''})`
        );
      }

      // Always add the cleaned playlist (even if it had issues)
      cleanedPlaylists.push(this.cleanPlaylistData(playlist, videos));
    });

    // Log validation summary
    if (validationIssues.length > 0) {
      console.warn('Export validation issues found:', validationIssues);
    }

    // Generate master metadata with cleaned playlists
    const metadata = this.generateMetadataJson(videos, cleanedPlaylists);
    
    // Generate playlist files
    const playlistFiles: Record<string, PlaylistExport> = {};
    
    // Add selected playlists
    cleanedPlaylists.forEach(playlist => {
      const playlistVideos = videos.filter(v => playlist.videoIds.includes(v.id));
      const fileName = `${playlist.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.json`;
      playlistFiles[fileName] = this.generatePlaylistJson(playlist, playlistVideos);
    });
    
    // Always include a default playlist
    if (!playlistFiles['default.json']) {
      playlistFiles['default.json'] = this.generateDefaultPlaylist(videos);
    }

    return {
      packageName,
      metadata,
      playlists: playlistFiles,
      stats: {
        totalVideos: videos.length,
        totalPlaylists: Object.keys(playlistFiles).length,
        totalSize: videos.reduce((sum, video) => sum + video.fileSize, 0)
      }
    };
  }

  /**
   * Validates the export package for DBTV compatibility
   */
  static validateExportPackage(exportPackage: ReturnType<typeof ExportService.generateExportPackage>): string[] {
    const errors: string[] = [];
    
    // Check for required default playlist
    if (!exportPackage.playlists['default.json']) {
      errors.push('Missing required default.json playlist');
    }
    
    // Check metadata completeness
    const { metadata } = exportPackage;
    if (!metadata.video_library.videos || Object.keys(metadata.video_library.videos).length === 0) {
      errors.push('No videos in metadata library');
    }
    
    // Check all videos have valid moods and categories
    Object.entries(metadata.video_library.videos).forEach(([filename, video]) => {
      if (!['ambient', 'high-energy', 'psychedelic'].includes(video.mood)) {
        errors.push(`Invalid mood for ${filename}: ${video.mood}`);
      }
      if (!['background_visuals', 'performance_visuals', 'ambient_visuals'].includes(video.category)) {
        errors.push(`Invalid category for ${filename}: ${video.category}`);
      }
    });
    
    // Check playlist references
    Object.entries(exportPackage.playlists).forEach(([playlistFile, playlist]) => {
      playlist.videos.forEach(video => {
        if (!metadata.video_library.videos[video.filename]) {
          errors.push(`Playlist ${playlistFile} references unknown video: ${video.filename}`);
        }
      });
    });
    
    return errors;
  }
}