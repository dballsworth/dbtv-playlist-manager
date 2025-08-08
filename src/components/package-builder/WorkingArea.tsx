import React from 'react';
import type { Playlist, Video } from '../../types';
import { Folder } from 'lucide-react';

interface WorkingAreaProps {
  playlists: Playlist[];
  videos: Video[];
  packageName: string;
  stats: {
    totalVideos: number;
    totalPlaylists: number;
    totalSize: number;
  };
  exportProgress: {
    isExporting: boolean;
    progress: number;
    currentFile: string;
  };
  saveProgress: {
    isSaving: boolean;
    progress: number;
    currentFile: string;
  };
  onPackageNameChange: (name: string) => void;
  onSave: () => void;
  onExport: () => void;
}

export const WorkingArea: React.FC<WorkingAreaProps> = ({
  playlists,
  videos,
  packageName,
  stats,
  exportProgress,
  saveProgress,
  onPackageNameChange,
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
          📊 Package Summary: {stats.totalPlaylists} playlists, {stats.totalVideos} videos, {formatFileSize(stats.totalSize)}
        </div>

        <div className="playlist-summary">
          <h4>📁 Playlists Included:</h4>
          {playlists.map((playlist) => {
            const playlistVideos = videos.filter(v => playlist.videoIds.includes(v.id));
            const playlistSize = playlistVideos.reduce((sum, video) => sum + video.fileSize, 0);
            
            return (
              <div key={playlist.id} className="playlist-summary-item">
                <div className="playlist-info">
                  <Folder size={16} className="playlist-icon" />
                  <div className="playlist-details">
                    <div className="playlist-name">{playlist.name}</div>
                    <div className="playlist-stats">
                      {videos.filter(v => playlist.videoIds.includes(v.id)).length} videos, {formatFileSize(playlistSize)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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

        {(exportProgress.isExporting || saveProgress.isSaving) && (
          <div className="export-progress">
            <div className="progress-header">
              <span>
                {saveProgress.isSaving ? 'Saving Package...' : 'Exporting Package...'}
              </span>
              <span>
                {saveProgress.isSaving ? saveProgress.progress : exportProgress.progress}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${saveProgress.isSaving ? saveProgress.progress : exportProgress.progress}%` }}
              />
            </div>
            <div className="progress-status">
              {saveProgress.isSaving ? saveProgress.currentFile : exportProgress.currentFile}
            </div>
          </div>
        )}

        <div className="package-actions">
          <input
            type="text"
            placeholder="Package name..."
            value={packageName}
            onChange={(e) => onPackageNameChange(e.target.value)}
            className="package-name-input"
          />
          <button 
            className="btn btn-secondary" 
            onClick={onSave}
            disabled={saveProgress.isSaving || exportProgress.isExporting}
          >
            {saveProgress.isSaving ? 'Saving...' : 'Save Package'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onExport}
            disabled={exportProgress.isExporting || saveProgress.isSaving}
          >
            {exportProgress.isExporting ? 'Exporting...' : 'Export & Download'}
          </button>
        </div>
      </div>
    </div>
  );
};