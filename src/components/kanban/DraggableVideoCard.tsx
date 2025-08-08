import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { VideoCardBase } from './VideoCardBase';
import type { Video, DragItem } from '../../types';

interface DraggableVideoCardProps {
  video: Video;
  onEdit?: (video: Video) => void;
  onDelete?: (videoId: string) => Promise<void>;
  isSelected?: boolean;
  onToggleSelection?: (videoId: string) => void;
}

export const DraggableVideoCard: React.FC<DraggableVideoCardProps> = ({ 
  video,
  onEdit,
  onDelete,
  isSelected = false,
  onToggleSelection
}) => {
  const dragId = `repository:${video.id}`;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: dragId,
    data: {
      id: video.id,
      type: 'video',
      sourceType: 'repository',
      sourceId: undefined,
    } as DragItem,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <VideoCardBase
      ref={setNodeRef}
      video={video}
      style={style}
      className={`repository-card ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      dragHandleProps={{
        ...listeners,
        ...attributes,
      }}
      sourceType="repository"
      onEdit={onEdit}
      onDelete={onDelete}
      isSelected={isSelected}
      onToggleSelection={onToggleSelection}
    />
  );
};