import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload, Trash2, AlertTriangle } from 'lucide-react';
import { VideoUpload } from './VideoUpload';
import { useSettings } from '../hooks/useSettings';
import { useVideoData } from '../hooks/useVideoData';
import { PackageLoaderService } from '../services/packageLoaderService';
import type { ViewMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isR2Configured, isInitializing } = useSettings();
  const { videos, playlists, clearAllPlaylists } = useVideoData();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [savedPackageCount, setSavedPackageCount] = useState(0);
  
  const getActiveTab = (): ViewMode => {
    if (location.pathname.includes('/packages')) return 'packages';
    if (location.pathname.includes('/settings')) return 'settings';
    return 'playlists';
  };

  const activeTab = getActiveTab();

  // Load saved package count
  useEffect(() => {
    const loadPackageCount = async () => {
      if (isR2Configured) {
        try {
          const result = await PackageLoaderService.listSavedPackages();
          setSavedPackageCount(result.packages.length);
        } catch (error) {
          console.warn('Failed to load package count:', error);
          setSavedPackageCount(0);
        }
      } else {
        setSavedPackageCount(0);
      }
    };

    loadPackageCount();
  }, [isR2Configured]);

  const handleUploadClick = () => {
    if (isInitializing) {
      alert('Please wait for R2 connection to initialize...');
      return;
    }
    if (!isR2Configured) {
      alert('Please configure R2 storage in Settings first');
      return;
    }
    setShowUploadModal(true);
  };

  const handleUploadComplete = (uploads: unknown[]) => {
    console.log('Uploads completed:', uploads);
    // Video data will be automatically refreshed through the service subscription
    setShowUploadModal(false);
  };

  const handleDeleteAllPlaylists = () => {
    setShowDeleteAllConfirm(true);
  };

  const handleConfirmDeleteAll = () => {
    clearAllPlaylists();
    setShowDeleteAllConfirm(false);
  };

  const handleCancelDeleteAll = () => {
    setShowDeleteAllConfirm(false);
  };

  // Check if we should show delete all button (only on playlists tab with playlists)
  const shouldShowDeleteAll = activeTab === 'playlists' && playlists.length > 0;

  return (
    <div className="layout">
      <header className="main-header">
        <nav className="nav-tabs">
          <Link 
            to="/playlists" 
            className={`nav-tab ${activeTab === 'playlists' ? 'active' : ''}`}
          >
            Playlists
          </Link>
          <Link 
            to="/packages" 
            className={`nav-tab ${activeTab === 'packages' ? 'active' : ''}`}
          >
            Packages
          </Link>
          <Link 
            to="/settings" 
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          >
            Settings
          </Link>
        </nav>
        <div className="header-actions">
          <button 
            onClick={handleUploadClick}
            className={`upload-btn ${!isR2Configured || isInitializing ? 'disabled' : ''}`}
            disabled={!isR2Configured || isInitializing}
            title={
              isInitializing ? 'R2 connection initializing...' :
              isR2Configured ? 'Upload videos to R2' : 'Configure R2 in Settings first'
            }
          >
            <Upload size={16} />
            Upload Videos
          </button>
          
          {shouldShowDeleteAll && (
            <button
              onClick={handleDeleteAllPlaylists}
              className="delete-all-btn btn-danger"
              title="Delete all playlists permanently"
            >
              <Trash2 size={16} />
              Delete All ({playlists.length})
            </button>
          )}
          
          <div className="header-stats">
            {videos.length} repository videos • {savedPackageCount} saved packages
          </div>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      
      {showUploadModal && (
        <VideoUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <AlertTriangle size={24} className="warning-icon" />
              <h3>Delete All Playlists</h3>
            </div>
            <div className="modal-content">
              <p className="warning-message">
                Are you sure you want to delete <strong>ALL {playlists.length} playlists</strong>?
              </p>
              <p className="warning-details">
                This will permanently delete all your playlists and their configurations. 
                Your videos will remain safe in the repository, but all playlist organization will be lost.
              </p>
              <p className="warning-final">
                <strong>This action cannot be undone.</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={handleCancelDeleteAll}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleConfirmDeleteAll}
              >
                <Trash2 size={16} />
                Yes, Delete All Playlists
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};