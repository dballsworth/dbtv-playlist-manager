import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { VideoUpload } from './VideoUpload';
import { useSettings } from '../hooks/useSettings';
import type { ViewMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isR2Configured } = useSettings();
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const getActiveTab = (): ViewMode => {
    if (location.pathname.includes('/packages')) return 'packages';
    if (location.pathname.includes('/settings')) return 'settings';
    return 'playlists';
  };

  const activeTab = getActiveTab();

  const handleUploadClick = () => {
    if (!isR2Configured) {
      alert('Please configure R2 storage in Settings first');
      return;
    }
    setShowUploadModal(true);
  };

  const handleUploadComplete = (uploads: any[]) => {
    console.log('Uploads completed:', uploads);
    // Video data will be automatically refreshed through the service subscription
    setShowUploadModal(false);
  };

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
            className={`upload-btn ${!isR2Configured ? 'disabled' : ''}`}
            disabled={!isR2Configured}
            title={isR2Configured ? 'Upload videos to R2' : 'Configure R2 in Settings first'}
          >
            <Upload size={16} />
            Upload Videos
          </button>
          <div className="header-stats">
            342 videos • 8 playlists
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
    </div>
  );
};