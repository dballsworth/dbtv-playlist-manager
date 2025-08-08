import React from 'react';
import type { Playlist, Video } from '../../types';

interface SelectionPanelProps {
  playlists: Playlist[];
  videos: Video[];
  selectedPlaylists: string[];
  selectedVideos: string[];
  activeTab: 'playlists' | 'videos';
  onTabChange: (tab: 'playlists' | 'videos') => void;
  onPlaylistToggle: (playlistId: string) => void;
  onVideoToggle: (videoId: string) => void;
}

export const SelectionPanel: React.FC<SelectionPanelProps> = ({
  playlists,
  videos,
  selectedPlaylists,
  selectedVideos,
  activeTab,
  onTabChange,
  onPlaylistToggle,
  onVideoToggle
}) => {
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const calculatePlaylistSize = (playlist: Playlist): number => {
    return playlist.videoIds
      .map(id => videos.find(v => v.id === id))
      .filter(Boolean)
      .reduce((sum, video) => sum + (video?.fileSize || 0), 0);
  };

  return (
    <div className="selection-panel">
      <div className="panel-header">Available Content</div>
      <div className="panel-content">
        <div className="selection-tabs">
          <div 
            className={`selection-tab ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => onTabChange('playlists')}
          >
            Playlists
          </div>
          <div 
            className={`selection-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => onTabChange('videos')}
          >
            Individual Files
          </div>
        </div>

        {activeTab === 'playlists' && (
          <div className="selection-list">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="selectable-item">
                <input
                  type="checkbox"
                  className="item-checkbox"
                  checked={selectedPlaylists.includes(playlist.id)}
                  onChange={() => onPlaylistToggle(playlist.id)}
                />
                <div>
                  <div className="item-title">{playlist.name}</div>
                  <div className="item-subtitle">
                    {videos.filter(v => playlist.videoIds.includes(v.id)).length} videos • {formatFileSize(calculatePlaylistSize(playlist))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="selection-list">
            {videos.map((video) => (
              <div key={video.id} className="selectable-item">
                <input
                  type="checkbox"
                  className="item-checkbox"
                  checked={selectedVideos.includes(video.id)}
                  onChange={() => onVideoToggle(video.id)}
                />
                <div>
                  <div className="item-title">{video.title}</div>
                  <div className="item-subtitle">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')} • {formatFileSize(video.fileSize)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};