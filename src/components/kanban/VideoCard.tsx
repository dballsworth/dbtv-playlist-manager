import React from 'react';
import { DraggableVideoCard } from './DraggableVideoCard';
import { SortableVideoCard } from './SortableVideoCard';
import type { Video } from '../../types';

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
  sourceType = 'repository',
  sourceId,
  onRemove,
  onDelete,
  onEdit,
  isSelected = false,
  onToggleSelection
}) => {
  // Factory pattern: choose the appropriate component based on context
  if (sourceType === 'repository') {
    return (
      <DraggableVideoCard
        video={video}
        onEdit={onEdit}
        onDelete={onDelete}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
      />
    );
  }
  
  if (sourceType === 'playlist' && sourceId) {
    return (
      <SortableVideoCard
        video={video}
        playlistId={sourceId}
        onRemove={onRemove}
        onEdit={onEdit}
      />
    );
  }
  
  // Fallback for invalid configuration
  return null;
};