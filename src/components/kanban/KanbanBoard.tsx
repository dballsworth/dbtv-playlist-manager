import React, { useState } from 'react';
import { 
  DndContext, 
  type DragEndEvent, 
  type DragOverEvent, 
  DragOverlay, 
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { RepositoryColumn } from './RepositoryColumn';
import { PlaylistColumn } from './PlaylistColumn';
import { AddPlaylistButton } from './AddPlaylistButton';
import { VideoCard } from './VideoCard';
import { VideoEditModal } from '../VideoEditModal';
import type { DragItem, Video } from '../../types';
import { useVideoData } from '../../hooks/useVideoData';
import { extractDragContext } from '../../utils/dragUtils';

export const KanbanBoard: React.FC = () => {
  const { 
    videos, 
    playlists, 
    repositoryVideos, 
    createPlaylist, 
    deletePlaylist, 
    renamePlaylist, 
    addVideoToPlaylist, 
    removeVideoFromPlaylist, 
    moveVideoToPlaylist,
    reorderVideosInPlaylist 
  } = useVideoData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);

  // Configure sensors for proper drag and drop interaction
  const mouseSensor = useSensor(MouseSensor, {
    // Reduced distance for easier drag activation during debugging
    activationConstraint: {
      distance: 3,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    // Press delay for touch to prevent scrolling conflicts
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  // Shared video editing handler
  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id as string;
    setActiveId(activeIdStr);
    
    // Determine what's being dragged
    const dragData = active.data.current as DragItem;
    
    // Add body class to indicate drag in progress
    document.body.classList.add('drag-in-progress');
    
    setActiveDragItem(dragData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !activeDragItem) {
      setOverId(null);
      setInsertionIndex(null);
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    setOverId(overId);
    
    // Parse drag contexts using utility function
    const activeContext = extractDragContext(activeId);
    const overContext = extractDragContext(overId);
    
    // Calculate insertion index for both intra-playlist and cross-container operations
    if (overContext.sourceType === 'playlist') {
      const targetPlaylistId = overContext.sourceId!;
      const playlist = playlists.find(p => p.id === targetPlaylistId);
      
      if (playlist) {
        const currentVideos = videos.filter(v => playlist.videoIds.includes(v.id));
        const currentOrder = playlist.videoOrder || currentVideos.map(v => v.id);
        
        // SCENARIO 1: Intra-playlist reordering
        if (activeContext.sourceType === 'playlist' && 
            activeContext.sourceId === overContext.sourceId) {
          
          const activeVideoId = activeContext.videoId;
          const overVideoId = overContext.videoId;
          
          const activeIndex = currentOrder.indexOf(activeVideoId);
          const overIndex = currentOrder.indexOf(overVideoId);
          
          // Set insertion index based on drag direction
          if (activeIndex !== -1 && overIndex !== -1) {
            setInsertionIndex(activeIndex < overIndex ? overIndex : overIndex);
          } else {
            setInsertionIndex(null);
          }
        }
        // SCENARIO 2: Cross-container drop (repository → playlist or playlist → different playlist)
        else {
          const overVideoId = overContext.videoId;
          const overIndex = currentOrder.indexOf(overVideoId);
          
          if (overIndex !== -1) {
            // Insert before the video we're hovering over
            setInsertionIndex(overIndex);
          } else {
            // If hovering over something not in the playlist, append to end
            setInsertionIndex(currentOrder.length);
          }
        }
      }
    } 
    // Handle drops on empty playlists
    else if (overId.startsWith('playlist-')) {
      // Drop on empty playlist container - insert at beginning (index 0)
      setInsertionIndex(0);
    }
    else {
      // Non-playlist operations
      setInsertionIndex(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Remove body class
    document.body.classList.remove('drag-in-progress');
    
    // Reset drag state
    setActiveId(null);
    setActiveDragItem(null);
    setOverId(null);
    setInsertionIndex(null);
    
    if (!over || !activeDragItem) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Parse drag contexts using utility function
    const activeContext = extractDragContext(activeId);
    const overContext = extractDragContext(overId);

    // SCENARIO 1: Intra-playlist reordering
    // Both items are in the same playlist and we're reordering
    if (activeContext.sourceType === 'playlist' && 
        overContext.sourceType === 'playlist' && 
        activeContext.sourceId === overContext.sourceId && 
        activeContext.videoId !== overContext.videoId) {
      
      const playlistId = activeContext.sourceId!;
      
      // Find the playlist and get current video order
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist) {
        return;
      }
      
      const currentVideos = videos.filter(v => playlist.videoIds.includes(v.id));
      const currentOrder = playlist.videoOrder || currentVideos.map(v => v.id);
      
      const oldIndex = currentOrder.indexOf(activeContext.videoId);
      const newIndex = currentOrder.indexOf(overContext.videoId);
      
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      
      // Call reorder with precise insertion index
      reorderVideosInPlaylist(playlistId, activeContext.videoId, newIndex);
      return;
    }

    // SCENARIO 2: Cross-container operations
    // Repository → Playlist OR Playlist → Different Playlist
    if (activeContext.sourceType === 'repository' && 
        (overContext.sourceType === 'playlist' || overId.startsWith('playlist-'))) {
      // Repository to playlist (can be video or empty playlist container)
      const targetPlaylistId = overId.startsWith('playlist-') ? 
        overId.replace('playlist-', '') : 
        overContext.sourceId!;
      
      // Use insertion index if available, otherwise append to end
      const insertAtIndex = insertionIndex !== null ? insertionIndex : undefined;
      addVideoToPlaylist(targetPlaylistId, activeContext.videoId, insertAtIndex);
      return;
    }
    
    if (activeContext.sourceType === 'playlist' && 
        overContext.sourceType === 'playlist' && 
        activeContext.sourceId !== overContext.sourceId) {
      // Playlist to different playlist
      const sourcePlaylistId = activeContext.sourceId!;
      const targetPlaylistId = overContext.sourceId!;
      
      // Use insertion index if available, otherwise append to end
      const insertAtIndex = insertionIndex !== null ? insertionIndex : undefined;
      moveVideoToPlaylist(sourcePlaylistId, targetPlaylistId, activeContext.videoId, insertAtIndex);
      return;
    }
  };

  const getDragOverlayContent = () => {
    if (!activeDragItem || !activeId) return null;

    if (activeDragItem.type === 'video') {
      const dragContext = extractDragContext(activeId);
      const video = videos.find(v => v.id === dragContext.videoId);
      if (video) {
        return <VideoCard video={video} isDragging />;
      }
    }

    return null;
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart} 
      onDragOver={handleDragOver} 
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        <RepositoryColumn 
          videos={repositoryVideos} 
          onEditVideo={handleEditVideo}
        />
        
        {playlists.map((playlist) => (
          <PlaylistColumn
            key={playlist.id}
            playlist={playlist}
            videos={videos.filter(v => playlist.videoIds.includes(v.id))}
            onRemoveVideo={removeVideoFromPlaylist}
            onEditVideo={handleEditVideo}
            onDeletePlaylist={deletePlaylist}
            onRenamePlaylist={renamePlaylist}
            dragOverId={overId}
            insertionIndex={insertionIndex}
          />
        ))}
        
        <AddPlaylistButton onCreatePlaylist={createPlaylist} />
      </div>

      <DragOverlay>
        {getDragOverlayContent()}
      </DragOverlay>

      {editingVideo && (
        <VideoEditModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onSave={() => {
            setEditingVideo(null);
          }}
        />
      )}
    </DndContext>
  );
};