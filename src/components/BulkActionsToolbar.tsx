import React, { useState } from 'react';
import { Trash2, FolderPlus, Check, X, Loader } from 'lucide-react';
import type { Playlist } from '../types';

interface BulkActionsToolbarProps {
  selectedCount: number;
  playlists: Playlist[];
  onDeleteSelected: () => Promise<void>;
  onAddToPlaylist: (playlistId: string) => Promise<void>;
  onCreatePlaylist: (name: string, selectedIds: string[]) => Promise<void>;
  onClearSelection: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  playlists,
  onDeleteSelected,
  onAddToPlaylist,
  onCreatePlaylist,
  onClearSelection
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} selected videos? This will permanently delete them from R2 storage and remove them from all playlists.`)) {
      return;
    }

    setIsLoading(true);
    try {
      await onDeleteSelected();
      onClearSelection();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    try {
      await onAddToPlaylist(playlistId);
      onClearSelection();
      setShowPlaylistSelector(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsLoading(true);
    try {
      await onCreatePlaylist(newPlaylistName.trim(), []);
      onClearSelection();
      setShowCreatePlaylist(false);
      setNewPlaylistName('');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bulk-actions-toolbar">
      <div className="bulk-actions-info">
        <span>{selectedCount} video{selectedCount !== 1 ? 's' : ''} selected</span>
        <button
          onClick={onClearSelection}
          className="btn btn-text"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>

      <div className="bulk-actions-buttons">
        <button
          onClick={handleDeleteSelected}
          disabled={isLoading}
          className="btn btn-danger"
          title="Delete selected videos"
        >
          {isLoading ? <Loader size={16} /> : <Trash2 size={16} />}
          Delete
        </button>

        <div className="bulk-action-dropdown">
          <button
            onClick={() => setShowPlaylistSelector(!showPlaylistSelector)}
            disabled={isLoading}
            className="btn btn-secondary"
            title="Add to playlist"
          >
            <FolderPlus size={16} />
            Add to Playlist
          </button>

          {showPlaylistSelector && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <span>Select Playlist</span>
                <button
                  onClick={() => setShowCreatePlaylist(true)}
                  className="btn btn-text"
                >
                  New Playlist
                </button>
              </div>
              
              <div className="dropdown-items">
                {playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    disabled={isLoading}
                    className="dropdown-item"
                  >
                    <span>{playlist.name}</span>
                    <small>{playlist.metadata.videoCount} videos</small>
                  </button>
                ))}
                
                {playlists.length === 0 && (
                  <div className="dropdown-item disabled">
                    No playlists available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showCreatePlaylist && (
          <div className="inline-form">
            <form onSubmit={handleCreatePlaylist} className="new-playlist-form">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name"
                className="form-input"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim() || isLoading}
                className="btn btn-primary"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName('');
                }}
                className="btn btn-secondary"
              >
                <X size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};