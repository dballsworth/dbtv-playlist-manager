import React, { useState } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent } from '@dnd-kit/core';
import { RepositoryColumn } from './RepositoryColumn';
import { PlaylistColumn } from './PlaylistColumn';
import { AddPlaylistButton } from './AddPlaylistButton';
import { VideoCard } from './VideoCard';
import type { DragItem } from '../../types';
import { useVideoData } from '../../hooks/useVideoData';
import { extractVideoId } from '../../utils/dragUtils';

export const KanbanBoard: React.FC = () => {
  const { videos, playlists, repositoryVideos, createPlaylist, addVideoToPlaylist, reorderVideosInPlaylist, removeVideoFromPlaylist, moveVideoToPlaylist } = useVideoData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Determine what's being dragged
    const dragData = active.data.current as DragItem;
    console.log('🚀 Drag Start:', {
      activeId: active.id,
      dragData,
      eventData: active.data.current
    });
    setActiveDragItem(dragData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 Drag End:', {
      activeId: active.id,
      overId: over?.id,
      activeDragItem,
      hasOver: !!over
    });
    
    if (!over || !activeDragItem) {
      console.log('❌ Drag cancelled: no over target or no drag item');
      setActiveId(null);
      setActiveDragItem(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle dropping video on playlist
    if (activeDragItem.type === 'video' && overId.startsWith('playlist-')) {
      const targetPlaylistId = overId.replace('playlist-', '');
      const videoId = extractVideoId(activeId);
      
      console.log('📋 Dropping video on playlist:', {
        videoId,
        targetPlaylistId,
        sourceType: activeDragItem.sourceType,
        sourceId: activeDragItem.sourceId
      });
      
      if (activeDragItem.sourceType === 'playlist') {
        // Moving from playlist to playlist - use move function
        const sourcePlaylistId = activeDragItem.sourceId!;
        // Don't move if dropping on the same playlist
        if (sourcePlaylistId !== targetPlaylistId) {
          console.log('🔄 Moving video between playlists');
          const result = moveVideoToPlaylist(sourcePlaylistId, targetPlaylistId, videoId);
          console.log('✅ Move result:', result);
        } else {
          console.log('⚠️ Skipping: same playlist');
        }
      } else {
        // Copying from repository to playlist - use add function
        console.log('➕ Adding video from repository to playlist');
        const result = addVideoToPlaylist(targetPlaylistId, videoId);
        console.log('✅ Add result:', result);
      }
    }

    // Handle reordering within playlist
    if (activeDragItem.type === 'video' && activeDragItem.sourceType === 'playlist') {
      const playlistId = activeDragItem.sourceId!;
      const videoId = extractVideoId(activeId);
      const overVideoId = extractVideoId(overId);
      // Implement reordering logic
      reorderVideosInPlaylist(playlistId, videoId, overVideoId);
    }

    setActiveId(null);
    setActiveDragItem(null);
  };

  const getDragOverlayContent = () => {
    if (!activeDragItem || !activeId) return null;

    if (activeDragItem.type === 'video') {
      const videoId = extractVideoId(activeId);
      const video = videos.find(v => v.id === videoId);
      if (video) {
        return <VideoCard video={video} isDragging />;
      }
    }

    return null;
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        <RepositoryColumn videos={repositoryVideos} />
        
        {playlists.map((playlist) => (
          <PlaylistColumn
            key={playlist.id}
            playlist={playlist}
            videos={videos.filter(v => playlist.videoIds.includes(v.id))}
            onRemoveVideo={removeVideoFromPlaylist}
          />
        ))}
        
        <AddPlaylistButton onCreatePlaylist={createPlaylist} />
      </div>

      <DragOverlay>
        {getDragOverlayContent()}
      </DragOverlay>
    </DndContext>
  );
};