import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface AddPlaylistButtonProps {
  onCreatePlaylist: (name: string) => void;
}

export const AddPlaylistButton: React.FC<AddPlaylistButtonProps> = ({ onCreatePlaylist }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const handleCreateClick = () => {
    setIsCreating(true);
    setPlaylistName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistName.trim()) {
      onCreatePlaylist(playlistName.trim());
      setIsCreating(false);
      setPlaylistName('');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setPlaylistName('');
  };

  if (isCreating) {
    return (
      <div className="add-playlist-form">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Playlist name..."
            className="playlist-name-input"
            autoFocus
          />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Create
            </button>
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="add-column-btn" onClick={handleCreateClick}>
      <Plus size={20} />
      <span>Add Playlist</span>
    </div>
  );
};