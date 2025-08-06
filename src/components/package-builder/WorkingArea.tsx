import React from 'react';
import type { Playlist, Video } from '../../types';
import { X, Folder, FileVideo } from 'lucide-react';

interface WorkingAreaProps {
  playlists: Playlist[];
  videos: Video[];
  packageName: string;
  stats: {
    totalVideos: number;
    totalPlaylists: number;
    totalSize: number;
  };
  onPackageNameChange: (name: string) => void;
  onRemovePlaylist: (playlistId: string) => void;
  onRemoveVideo: (videoId: string) => void;
  onSave: () => void;
  onExport: () => void;
}

export const WorkingArea: React.FC<WorkingAreaProps> = ({
  playlists,
  videos,
  packageName,
  stats,
  onPackageNameChange,
  onRemovePlaylist,
  onRemoveVideo,
  onSave,
  onExport
}) => {
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="working-area">
      <div className="panel-header">Package Contents</div>
      <div className="panel-content">
        <div className="package-stats">
          Total: {stats.totalVideos} videos • {formatFileSize(stats.totalSize)}
        </div>

        <div className="working-items">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="working-item">
              <div className="item-info">
                <Folder size={16} className="item-icon" />
                <div>
                  <div className="item-title">{playlist.name}</div>
                  <div className="item-subtitle">{playlist.videoIds.length} videos</div>
                </div>
              </div>
              <button 
                className="remove-btn"
                onClick={() => onRemovePlaylist(playlist.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {videos.map((video) => (
            <div key={video.id} className="working-item">
              <div className="item-info">
                <FileVideo size={16} className="item-icon" />
                <div>
                  <div className="item-title">{video.title}</div>
                  <div className="item-subtitle">{formatFileSize(video.fileSize)}</div>
                </div>
              </div>
              <button 
                className="remove-btn"
                onClick={() => onRemoveVideo(video.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="folder-preview">
          <div className="folder-line">📦 {packageName || 'untitled-package'}/</div>
          <div className="folder-line folder-indent">📁 content/</div>
          <div className="folder-line folder-indent folder-indent">📁 packages/</div>
          <div className="folder-line folder-indent folder-indent folder-indent">🎬 *.mp4</div>
          <div className="folder-line folder-indent folder-indent folder-indent">📄 metadata.json</div>
          <div className="folder-line folder-indent folder-indent folder-indent">📁 thumbnails/</div>
          <div className="folder-line folder-indent folder-indent folder-indent folder-indent">🖼️ *.jpg</div>
          <div className="folder-line folder-indent folder-indent">📁 playlists/</div>
          {playlists.map((playlist) => (
            <div key={playlist.id} className="folder-line folder-indent folder-indent folder-indent">
              📄 {playlist.name.toLowerCase().replace(/\s+/g, '-')}.json
            </div>
          ))}
        </div>

        <div className="package-actions">
          <input
            type="text"
            placeholder="Package name..."
            value={packageName}
            onChange={(e) => onPackageNameChange(e.target.value)}
            className="package-name-input"
          />
          <button className="btn btn-secondary" onClick={onSave}>
            Save Package
          </button>
          <button className="btn btn-primary" onClick={onExport}>
            Export & Download
          </button>
        </div>
      </div>
    </div>
  );
};