import React, { useState } from 'react';
import { KanbanBoard } from './kanban/KanbanBoard';
import { PackageBrowser } from './package-loader/PackageBrowser';
import { r2Client } from '../services/r2Client';
import { Package2, ChevronDown, ChevronRight } from 'lucide-react';

export const PlaylistsView: React.FC = () => {
  const [showPackageBrowser, setShowPackageBrowser] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const isR2Configured = r2Client.isConfigured();

  const handlePlaylistsImported = (count: number) => {
    setImportNotification(`Successfully imported ${count} playlist${count !== 1 ? 's' : ''}! Check the kanban board below.`);
    
    // Clear notification after 5 seconds
    setTimeout(() => {
      setImportNotification(null);
    }, 5000);
  };

  const handleTogglePackageBrowser = () => {
    setShowPackageBrowser(!showPackageBrowser);
  };

  return (
    <div className="playlists-view">
      {/* Load Existing Package Section */}
      {isR2Configured && (
        <div className="package-loader-section">
          <div className="section-header" onClick={handleTogglePackageBrowser}>
            <div className="section-title">
              <Package2 size={20} />
              <h3>Load an Existing Content Package</h3>
              {showPackageBrowser ? (
                <ChevronDown size={18} className="chevron" />
              ) : (
                <ChevronRight size={18} className="chevron" />
              )}
            </div>
            <p className="section-description">
              Import playlist configurations from previously saved packages as a starting point for modifications
            </p>
          </div>
          
          {showPackageBrowser && (
            <div className="section-content">
              <PackageBrowser onPlaylistsImported={handlePlaylistsImported} />
            </div>
          )}
        </div>
      )}

      {/* Import Success Notification */}
      {importNotification && (
        <div className="import-notification success">
          <div className="notification-content">
            <Package2 size={16} />
            <span>{importNotification}</span>
          </div>
          <button 
            onClick={() => setImportNotification(null)} 
            className="notification-close"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Kanban Board */}
      <div className="kanban-section">
        <KanbanBoard />
      </div>
    </div>
  );
};