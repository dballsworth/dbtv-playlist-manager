import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { VideoCardBase } from './VideoCardBase';
import type { Video, DragItem } from '../../types';

interface SortableVideoCardProps {
  video: Video;
  playlistId: string;
  onRemove?: (videoId: string) => void;
  onEdit?: (video: Video) => void;
}

export const SortableVideoCard: React.FC<SortableVideoCardProps> = ({ 
  video,
  playlistId,
  onRemove,
  onEdit
}) => {
  const dragId = `playlist:${playlistId}:${video.id}`;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      id: video.id,
      type: 'video',
      sourceType: 'playlist',
      sourceId: playlistId,
    } as DragItem,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <VideoCardBase
      ref={setNodeRef}
      video={video}
      style={style}
      className={isDragging ? 'dragging' : ''}
      dragHandleProps={{
        ...listeners,
        ...attributes,
      }}
      sourceType="playlist"
      onRemove={onRemove}
      onEdit={onEdit}
    />
  );
};