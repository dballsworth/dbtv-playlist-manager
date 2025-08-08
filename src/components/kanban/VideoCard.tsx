import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Video } from '../../types';
import { createDragId } from '../../utils/dragUtils';
import { useThumbnail } from '../../hooks/useThumbnail';
// import { useVideoData } from '../../hooks/useVideoData';  // For future video URL usage
import { X, Edit, Loader } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  isCompact?: boolean;
  isDragging?: boolean;
  sourceType?: 'repository' | 'playlist';
  sourceId?: string;
  onRemove?: (videoId: string) => void;
  onDelete?: (videoId: string) => Promise<void>;
  onEdit?: (video: Video) => void;
  isSelected?: boolean;
  onToggleSelection?: (videoId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  isCompact = false, 
  isDragging = false,
  sourceType = 'repository',
  sourceId,
  onRemove,
  onDelete,
  onEdit,
  isSelected = false,
  onToggleSelection
}) => {
  // const { getVideoUrl } = useVideoData(); // For future video URL usage
  const { dataUrl: thumbnailDataUrl, isLoading: thumbnailLoading, error: thumbnailError, aspectRatio } = useThumbnail(video);
  const dragId = createDragId(video.id, sourceType, sourceId);
  
  // Use draggable for all videos to enable cross-container dragging
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: dragId,
    data: {
      id: video.id,
      type: 'video' as const,
      sourceType,
      sourceId,
    } as const,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

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
    } catch (error) {
      // Error handling is done in the parent component
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
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const cardClass = `video-card ${isCompact ? 'repository-card' : ''} ${isCurrentlyDragging || isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
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
        {...listeners}
        {...attributes}
      >
        <div 
          className={`card-thumbnail ${isCompact ? 'repository-thumbnail' : ''}`}
          style={{
            aspectRatio: aspectRatio && aspectRatio > 0 ? aspectRatio : undefined,
            height: aspectRatio && aspectRatio > 0 ? 'auto' : undefined
          }}
        >
          {thumbnailDataUrl ? (
            <img 
              src={thumbnailDataUrl} 
              alt={video.title}
              style={{ 
                aspectRatio: aspectRatio && aspectRatio > 0 ? aspectRatio : undefined 
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
        
        <div className={`card-title ${isCompact ? 'repository-title' : ''}`}>
          {video.title}
        </div>
        
        <div className="card-metadata">
          <span>{formatDuration(video.duration)}</span>
          {isCompact ? (
            <span className="usage-indicator">
              {/* TODO: Calculate usage */}
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
      
      {/* Remove/Delete button area - no drag listeners */}
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
};