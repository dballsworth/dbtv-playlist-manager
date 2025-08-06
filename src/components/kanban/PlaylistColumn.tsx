import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { VideoCard } from './VideoCard';
import type { Video, Playlist } from '../../types';
import { MoreVertical } from 'lucide-react';
import { createDragId } from '../../utils/dragUtils';

interface PlaylistColumnProps {
  playlist: Playlist;
  videos: Video[];
  onRemoveVideo?: (playlistId: string, videoId: string) => void;
}

export const PlaylistColumn: React.FC<PlaylistColumnProps> = ({ playlist, videos, onRemoveVideo }) => {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: `playlist-${playlist.id}`,
  });

  // Debug logging for drop events
  React.useEffect(() => {
    if (isOver) {
      console.log(`🎯 Video being dragged over playlist: ${playlist.name} (${playlist.id})`);
    }
  }, [isOver, playlist.name, playlist.id]);

  const videoDragIds = videos.map(v => createDragId(v.id, 'playlist', playlist.id));

  const handleRemoveVideo = (videoId: string) => {
    if (onRemoveVideo) {
      onRemoveVideo(playlist.id, videoId);
    }
  };

  return (
    <div className="kanban-column">
      <div className="column-header">
        <span>{playlist.name} ({videos.length})</span>
        <button className="column-menu-btn">
          <MoreVertical size={16} />
        </button>
      </div>
      <div 
        ref={setNodeRef}
        className={`column-content ${isOver ? 'drag-over' : ''}`}
      >
        <SortableContext items={videoDragIds} strategy={verticalListSortingStrategy}>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              sourceType="playlist"
              sourceId={playlist.id}
              onRemove={handleRemoveVideo}
            />
          ))}
        </SortableContext>
        
        {videos.length === 0 && (
          <div className="empty-playlist">
            <p>Drop videos here</p>
          </div>
        )}
      </div>
    </div>
  );
};