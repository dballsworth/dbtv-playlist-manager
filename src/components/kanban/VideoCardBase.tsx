import React, { forwardRef } from 'react';
import type { Video } from '../../types';
import { useThumbnail } from '../../hooks/useThumbnail';
import { X, Edit, Loader } from 'lucide-react';

interface VideoCardBaseProps {
  video: Video;
  style?: React.CSSProperties;
  className?: string;
  dragHandleProps?: Record<string, any>;
  sourceType: 'repository' | 'playlist';
  onRemove?: (videoId: string) => void;
  onDelete?: (videoId: string) => Promise<void>;
  onEdit?: (video: Video) => void;
  isSelected?: boolean;
  onToggleSelection?: (videoId: string) => void;
}

export const VideoCardBase = forwardRef<HTMLDivElement, VideoCardBaseProps>(({
  video,
  style,
  className = '',
  dragHandleProps = {},
  sourceType,
  onRemove,
  onDelete,
  onEdit,
  isSelected = false,
  onToggleSelection
}, ref) => {
  const { dataUrl: thumbnailDataUrl, isLoading: thumbnailLoading, error: thumbnailError, aspectRatio, reload: reloadThumbnail } = useThumbnail(video);
  const [imageLoadError, setImageLoadError] = React.useState(false);
  
  const isCompact = sourceType === 'repository';

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(video.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onDelete) return;
    
    const hasR2Storage = !!video.r2Storage;
    const confirmMessage = hasR2Storage 
      ? `Are you sure you want to permanently delete "${video.title}"? This will remove it from all playlists and delete the file from R2 storage.`
      : `Are you sure you want to permanently delete "${video.title}"? This will remove it from all playlists.`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      await onDelete(video.id);
    } catch (err) {
      console.error('Error deleting video:', err);
    }
  };

  const handleToggleSelection = (e: React.MouseEvent | React.ChangeEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(video.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(video);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`video-card ${className}`}
      data-video-id={video.id}
    >
      {/* Selection checkbox - only for repository videos */}
      {sourceType === 'repository' && onToggleSelection && (
        <div className="video-selection-wrapper">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelection}
            className="video-selection-checkbox"
          />
        </div>
      )}
      
      {/* Drag handle area - has drag listeners */}
      <div 
        className="card-drag-handle" 
        {...dragHandleProps}
      >
        <div 
          className={`card-thumbnail ${isCompact ? 'repository-thumbnail' : ''}`}
          style={{
            aspectRatio: aspectRatio && aspectRatio > 0 ? aspectRatio : undefined,
            height: aspectRatio && aspectRatio > 0 ? 'auto' : undefined
          }}
        >
          {thumbnailDataUrl && !imageLoadError ? (
            <img 
              src={thumbnailDataUrl} 
              alt={video.title}
              style={{ 
                aspectRatio: aspectRatio && aspectRatio > 0 ? aspectRatio : undefined 
              }}
              onError={() => {
                setImageLoadError(true);
                if (reloadThumbnail) {
                  reloadThumbnail(true);
                }
              }}
            />
          ) : thumbnailLoading ? (
            <div className="thumbnail-placeholder">
              <Loader size={16} className="thumbnail-loading" />
              <small>Loading...</small>
            </div>
          ) : thumbnailError ? (
            <div className="thumbnail-placeholder">
              <div>⚠️</div>
              <small>Failed</small>
            </div>
          ) : video.r2Storage ? (
            <div className="thumbnail-placeholder">
              <div>☁️</div>
              <small>R2</small>
            </div>
          ) : (
            <div className="thumbnail-placeholder">🎬</div>
          )}
        </div>
        
        <div className="card-title">
          {video.title}
        </div>
        
        <div className="card-metadata">
          <span>{formatDuration(video.duration)}</span>
          {isCompact ? (
            <span className="usage-indicator">
              ✓ 2 playlists
            </span>
          ) : (
            <span>{formatFileSize(video.fileSize)}</span>
          )}
        </div>
        
        {video.tags.length > 0 && (
          <div className="card-tags">
            {video.tags.map(tag => `#${tag}`).join(' ')}
          </div>
        )}
      </div>
      
      {/* Action buttons - no drag listeners */}
      {sourceType === 'playlist' && onRemove && (
        <button 
          className="remove-btn card-remove-btn"
          onClick={handleRemove}
          title="Remove from playlist"
        >
          <X size={14} />
        </button>
      )}
      
      {sourceType === 'repository' && onEdit && (
        <button 
          className="edit-btn card-action-btn"
          onClick={handleEdit}
          title="Edit video metadata"
        >
          <Edit size={14} />
        </button>
      )}
      
      {sourceType === 'repository' && onDelete && (
        <button 
          className="remove-btn card-remove-btn delete-btn"
          onClick={handleDelete}
          title="Delete video permanently"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});