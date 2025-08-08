import React, { useState, useRef, useEffect } from 'react';
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
}

export const PlaylistColumn: React.FC<PlaylistColumnProps> = ({ 
  playlist, 
  videos, 
  onRemoveVideo, 
  onEditVideo, 
  onDeletePlaylist, 
  onRenamePlaylist 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(playlist.name);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      <div 
        ref={setNodeRef}
        className={`column-content ${isOver ? 'drag-over' : ''}`}
      >
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            sourceType="playlist"
            sourceId={playlist.id}
            onRemove={handleRemoveVideo}
            onEdit={onEditVideo}
          />
        ))}
        
        {videos.length === 0 && (
          <div className="empty-playlist">
            <p>Drop videos here</p>
          </div>
        )}
      </div>
    </div>
  );
};