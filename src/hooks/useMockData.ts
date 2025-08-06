import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Video, Playlist } from '../types';

// Mock data
const mockVideos: Video[] = [
  {
    id: '1',
    title: 'Fractal Spiral Loop',
    filename: 'fractal_spiral_loop.mp4',
    duration: 134, // 2:14
    fileSize: 15 * 1024 * 1024, // 15MB
    thumbnailUrl: '',
    tags: ['psychedelic', 'loop', 'colorful'],
    dateAdded: new Date('2024-08-02'),
    lastModified: new Date('2024-08-02'),
    metadata: {
      resolution: '1920x1080',
      codec: 'h264',
      bitrate: 8000
    }
  },
  {
    id: '2',
    title: 'Ocean Waves Abstract',
    filename: 'ocean_waves_abstract.mp4',
    duration: 272, // 4:32
    fileSize: 22 * 1024 * 1024, // 22MB
    thumbnailUrl: '',
    tags: ['ambient', 'blue', 'water'],
    dateAdded: new Date('2024-08-03'),
    lastModified: new Date('2024-08-03'),
    metadata: {
      resolution: '1920x1080',
      codec: 'h264',
      bitrate: 8000
    }
  },
  {
    id: '3',
    title: 'Lightning Energy',
    filename: 'lightning_energy.mp4',
    duration: 105, // 1:45
    fileSize: 12 * 1024 * 1024, // 12MB
    thumbnailUrl: '',
    tags: ['energy', 'electric', 'purple'],
    dateAdded: new Date('2024-08-01'),
    lastModified: new Date('2024-08-01'),
    metadata: {
      resolution: '1920x1080',
      codec: 'h264',
      bitrate: 8000
    }
  },
  {
    id: '4',
    title: 'Kaleidoscope Dreams',
    filename: 'kaleidoscope_dreams.mp4',
    duration: 202, // 3:22
    fileSize: 18 * 1024 * 1024, // 18MB
    thumbnailUrl: '',
    tags: ['psychedelic', 'patterns'],
    dateAdded: new Date('2024-07-28'),
    lastModified: new Date('2024-07-28'),
    metadata: {
      resolution: '1920x1080',
      codec: 'h264',
      bitrate: 8000
    }
  },
  {
    id: '5',
    title: 'Cloud Formations',
    filename: 'cloud_formations.mp4',
    duration: 318, // 5:18
    fileSize: 25 * 1024 * 1024, // 25MB
    thumbnailUrl: '',
    tags: ['ambient', 'white', 'soft'],
    dateAdded: new Date('2024-07-30'),
    lastModified: new Date('2024-07-30'),
    metadata: {
      resolution: '1920x1080',
      codec: 'h264',
      bitrate: 8000
    }
  },
  {
    id: '6',
    title: 'Upcoming Shows Slide',
    filename: 'upcoming_shows_slide.mp4',
    duration: 30, // 0:30
    fileSize: 5 * 1024 * 1024, // 5MB
    thumbnailUrl: '',
    tags: ['promo', 'dates'],
    dateAdded: new Date('2024-08-04'),
    lastModified: new Date('2024-08-04'),
    metadata: {
      resolution: '1920x1080',
      codec: 'h264',
      bitrate: 8000
    }
  }
];

const mockPlaylists: Playlist[] = [
  {
    id: 'playlist-1',
    name: 'Psychedelic A',
    description: 'Mind-bending visuals for intense performances',
    videoIds: ['1', '4'],
    videoOrder: ['1', '4'],
    dateCreated: new Date('2024-08-01'),
    lastModified: new Date('2024-08-02'),
    tags: ['psychedelic'],
    metadata: {
      totalDuration: 336,
      videoCount: 2,
      totalSize: 33 * 1024 * 1024
    }
  },
  {
    id: 'playlist-2',
    name: 'Ambient Chill',
    description: 'Calm background visuals for startup and breaks',
    videoIds: ['2', '5'],
    videoOrder: ['2', '5'],
    dateCreated: new Date('2024-07-30'),
    lastModified: new Date('2024-08-03'),
    tags: ['ambient'],
    metadata: {
      totalDuration: 590,
      videoCount: 2,
      totalSize: 47 * 1024 * 1024
    }
  },
  {
    id: 'playlist-3',
    name: 'Set Break Content',
    description: 'Interactive audience engagement content between sets',
    videoIds: ['6'],
    videoOrder: ['6'],
    dateCreated: new Date('2024-08-04'),
    lastModified: new Date('2024-08-04'),
    tags: ['promo'],
    metadata: {
      totalDuration: 30,
      videoCount: 1,
      totalSize: 5 * 1024 * 1024
    }
  }
];

export const useMockData = () => {
  const [videos] = useState<Video[]>(mockVideos);
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);

  const createPlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: uuidv4(),
      name,
      description: '',
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
    
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const addVideoToPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists(prev => prev.map(playlist => {
      if (playlist.id === playlistId && !playlist.videoIds.includes(videoId)) {
        const video = videos.find(v => v.id === videoId);
        const updatedVideoIds = [...playlist.videoIds, videoId];
        const updatedVideoOrder = [...playlist.videoOrder, videoId];
        
        return {
          ...playlist,
          videoIds: updatedVideoIds,
          videoOrder: updatedVideoOrder,
          lastModified: new Date(),
          metadata: {
            ...playlist.metadata,
            videoCount: updatedVideoIds.length,
            totalDuration: playlist.metadata.totalDuration + (video?.duration || 0),
            totalSize: playlist.metadata.totalSize + (video?.fileSize || 0)
          }
        };
      }
      return playlist;
    }));
  };

  const reorderVideosInPlaylist = (playlistId: string, activeId: string, overId: string) => {
    setPlaylists(prev => prev.map(playlist => {
      if (playlist.id === playlistId) {
        const oldIndex = playlist.videoOrder.indexOf(activeId);
        const newIndex = playlist.videoOrder.indexOf(overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...playlist.videoOrder];
          newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, activeId);
          
          return {
            ...playlist,
            videoOrder: newOrder,
            lastModified: new Date()
          };
        }
      }
      return playlist;
    }));
  };

  const removeVideoFromPlaylist = (playlistId: string, videoId: string) => {
    setPlaylists(prev => prev.map(playlist => {
      if (playlist.id === playlistId && playlist.videoIds.includes(videoId)) {
        const video = videos.find(v => v.id === videoId);
        const updatedVideoIds = playlist.videoIds.filter(id => id !== videoId);
        const updatedVideoOrder = playlist.videoOrder.filter(id => id !== videoId);
        
        return {
          ...playlist,
          videoIds: updatedVideoIds,
          videoOrder: updatedVideoOrder,
          lastModified: new Date(),
          metadata: {
            ...playlist.metadata,
            videoCount: updatedVideoIds.length,
            totalDuration: playlist.metadata.totalDuration - (video?.duration || 0),
            totalSize: playlist.metadata.totalSize - (video?.fileSize || 0)
          }
        };
      }
      return playlist;
    }));
  };

  const moveVideoToPlaylist = (sourcePlaylistId: string | null, targetPlaylistId: string, videoId: string) => {
    setPlaylists(prev => prev.map(playlist => {
      const video = videos.find(v => v.id === videoId);
      
      // Remove from source playlist
      if (sourcePlaylistId && playlist.id === sourcePlaylistId && playlist.videoIds.includes(videoId)) {
        const updatedVideoIds = playlist.videoIds.filter(id => id !== videoId);
        const updatedVideoOrder = playlist.videoOrder.filter(id => id !== videoId);
        
        return {
          ...playlist,
          videoIds: updatedVideoIds,
          videoOrder: updatedVideoOrder,
          lastModified: new Date(),
          metadata: {
            ...playlist.metadata,
            videoCount: updatedVideoIds.length,
            totalDuration: playlist.metadata.totalDuration - (video?.duration || 0),
            totalSize: playlist.metadata.totalSize - (video?.fileSize || 0)
          }
        };
      }
      
      // Add to target playlist
      if (playlist.id === targetPlaylistId && !playlist.videoIds.includes(videoId)) {
        const updatedVideoIds = [...playlist.videoIds, videoId];
        const updatedVideoOrder = [...playlist.videoOrder, videoId];
        
        return {
          ...playlist,
          videoIds: updatedVideoIds,
          videoOrder: updatedVideoOrder,
          lastModified: new Date(),
          metadata: {
            ...playlist.metadata,
            videoCount: updatedVideoIds.length,
            totalDuration: playlist.metadata.totalDuration + (video?.duration || 0),
            totalSize: playlist.metadata.totalSize + (video?.fileSize || 0)
          }
        };
      }
      
      return playlist;
    }));
  };

  return {
    videos,
    playlists,
    createPlaylist,
    addVideoToPlaylist,
    reorderVideosInPlaylist,
    removeVideoFromPlaylist,
    moveVideoToPlaylist
  };
};