import React, { useState, useRef, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { VideoCard } from './VideoCard';
import type { Video, Playlist } from '../../types';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface PlaylistColumnProps {
  playlist: Playlist;
  videos: Video[];
  onRemoveVideo?: (playlistId: string, videoId: string) => Promise<boolean>;
  onEditVideo?: (video: Video) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onRenamePlaylist?: (playlistId: string, newName: string) => void;
  dragOverId?: string | null;
  insertionIndex?: number | null;
}

export const PlaylistColumn: React.FC<PlaylistColumnProps> = ({ 
  playlist, 
  videos, 
  onRemoveVideo, 
  onEditVideo, 
  onDeletePlaylist, 
  onRenamePlaylist,
  dragOverId,
  insertionIndex
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(playlist.name);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleRemoveVideo = async (videoId: string) => {
    if (onRemoveVideo) {
      await onRemoveVideo(playlist.id, videoId);
    }
  };

  const handleRename = () => {
    setIsRenaming(true);
    setShowDropdown(false);
  };

  const handleSaveRename = () => {
    if (newName.trim() && newName.trim() !== playlist.name && onRenamePlaylist) {
      onRenamePlaylist(playlist.id, newName.trim());
    }
    setIsRenaming(false);
    setNewName(playlist.name);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewName(playlist.name);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the playlist "${playlist.name}"?\n\n` +
      `This playlist contains ${videos.length} video${videos.length !== 1 ? 's' : ''}.\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed && onDeletePlaylist) {
      onDeletePlaylist(playlist.id);
    }
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Create sorted video list based on playlist's videoOrder
  const sortedVideos = React.useMemo(() => {
    if (!playlist.videoOrder || playlist.videoOrder.length === 0) {
      return videos;
    }
    
    // Sort videos according to the order specified in playlist.videoOrder
    return videos.sort((a, b) => {
      const aIndex = playlist.videoOrder.indexOf(a.id);
      const bIndex = playlist.videoOrder.indexOf(b.id);
      
      // If video is not in the order array, put it at the end
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });
  }, [videos, playlist.videoOrder]);

  // Create sortable IDs for the videos in this playlist
  const sortableIds = sortedVideos.map(video => `playlist:${playlist.id}:${video.id}`);
  
  // Set up droppable for empty playlists
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `playlist-${playlist.id}`,
    disabled: videos.length > 0, // Only enable when playlist is empty
  });
  
  // Check if we're currently being dragged over
  // This covers: intra-playlist sorting, cross-container drops, and empty playlist drops
  const isDraggedOver = (dragOverId && (
    dragOverId.startsWith(`playlist-${playlist.id}`) || 
    dragOverId.includes(`playlist:${playlist.id}:`)
  )) || isOver;

  return (
    <div className="kanban-column">
      <div className="column-header">
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            className="playlist-rename-input"
            autoFocus
            style={{
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
              flex: 1,
              minWidth: 0
            }}
          />
        ) : (
          <span>{playlist.name} ({videos.length})</span>
        )}
        
        <div className="dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            className="column-menu-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MoreVertical size={16} />
          </button>
          
          {showDropdown && (
            <div 
              className="dropdown-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                minWidth: '120px',
                zIndex: 1000
              }}
            >
              <button 
                onClick={handleRename}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Edit2 size={14} />
                Rename
              </button>
              <button 
                onClick={handleDelete}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#dc3545'
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="column-content">
        {videos.length > 0 ? (
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {sortedVideos.map((video, index) => (
              <React.Fragment key={video.id}>
                {/* Show insertion indicator before this video for both intra-playlist and cross-container drops */}
                {isDraggedOver && insertionIndex !== null && insertionIndex !== undefined && insertionIndex === index && (
                  <div className="drop-insertion-indicator" key={`before-${index}`}>
                    <div className="drop-line"></div>
                    <div className="drop-text">Drop here</div>
                  </div>
                )}
                <VideoCard
                  video={video}
                  sourceType="playlist"
                  sourceId={playlist.id}
                  onRemove={handleRemoveVideo}
                  onEdit={onEditVideo}
                />
                {/* Show insertion indicator after this video for both intra-playlist and cross-container drops */}
                {isDraggedOver && insertionIndex !== null && insertionIndex !== undefined && insertionIndex === index + 1 && (
                  <div className="drop-insertion-indicator" key={`after-${index}`}>
                    <div className="drop-line"></div>
                    <div className="drop-text">Drop here</div>
                  </div>
                )}
              </React.Fragment>
            ))}
            
            {/* Show insertion indicator at the end for both intra-playlist and cross-container drops */}
            {isDraggedOver && insertionIndex !== null && insertionIndex !== undefined && insertionIndex >= sortedVideos.length && (
              <div className="drop-insertion-indicator" key="end">
                <div className="drop-line"></div>
                <div className="drop-text">Drop here</div>
              </div>
            )}
          </SortableContext>
        ) : (
          <div 
            ref={setDroppableRef}
            className={`empty-playlist ${isDraggedOver ? 'drag-over' : ''}`}
          >
            <p>Drop videos here</p>
          </div>
        )}
      </div>
    </div>
  );
};