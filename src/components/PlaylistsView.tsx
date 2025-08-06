import React from 'react';
import { KanbanBoard } from './kanban/KanbanBoard';

export const PlaylistsView: React.FC = () => {
  return (
    <div className="playlists-view">
      <KanbanBoard />
    </div>
  );
};