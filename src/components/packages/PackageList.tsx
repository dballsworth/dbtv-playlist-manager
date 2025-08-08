import React, { useState, useEffect } from 'react';
import { PackageLoaderService, type SavedPackage } from '../../services/packageLoaderService';
import { r2Client } from '../../services/r2Client';
import { Package, Calendar, HardDrive, Copy, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

export const PackageList: React.FC = () => {
  const [packages, setPackages] = useState<SavedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await PackageLoaderService.listSavedPackages();
      if (result.error) {
        setError(result.error);
      } else {
        setPackages(result.packages);
        console.log(`📦 Loaded ${result.packages.length} packages for list view`);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const getPackageUrl = (pkg: SavedPackage): string | null => {
    return r2Client.getPublicUrl(pkg.r2Key);
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      console.log(`📋 Copied URL to clipboard: ${url}`);
      
      // Clear copied state after 2 seconds
      setTimeout(() => {
        setCopiedUrl(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback: select the text for manual copying
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleDownloadPackage = async (pkg: SavedPackage) => {
    try {
      console.log(`⬇️ Downloading package: ${pkg.packageName}`);
      const result = await PackageLoaderService.downloadPackage(pkg.r2Key);
      
      if (!result.success) {
        console.error(`Download failed: ${result.error}`);
      } else {
        console.log(`✅ Package downloaded: ${pkg.filename}`);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (loading) {
    return (
      <div className="package-list loading">
        <div className="loading-message">
          <RefreshCw className="loading-icon" />
          <span>Loading saved packages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="package-list error">
        <div className="error-message">
          <AlertTriangle className="error-icon" />
          <div className="error-content">
            <span>Failed to load packages</span>
            <p>{error}</p>
            <button onClick={loadPackages} className="btn btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="package-list empty">
        <div className="empty-message">
          <Package className="empty-icon" />
          <span>No saved packages found</span>
          <p>Create and save packages from the Package Builder to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="package-list">
      <div className="list-header">
        <div className="header-info">
          <Package size={20} />
          <h3>Saved Packages ({packages.length})</h3>
        </div>
        <button 
          onClick={loadPackages} 
          className="btn btn-secondary refresh-btn"
          title="Refresh package list"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="packages-grid">
        {packages.map((pkg) => {
          const packageUrl = getPackageUrl(pkg);
          const isCopied = copiedUrl === packageUrl;

          return (
            <div key={pkg.r2Key} className="package-card">
              <div className="package-info">
                <div className="package-name">
                  <Package size={18} />
                  <span>{pkg.packageName}</span>
                </div>
                
                <div className="package-metadata">
                  <div className="metadata-row">
                    <Calendar size={14} />
                    <span>{PackageLoaderService.formatDate(pkg.lastModified)}</span>
                  </div>
                  <div className="metadata-row">
                    <HardDrive size={14} />
                    <span>{PackageLoaderService.formatFileSize(pkg.size)}</span>
                  </div>
                </div>

                <div className="package-filename">
                  <span className="filename-label">File:</span>
                  <span className="filename">{pkg.filename}</span>
                </div>
              </div>

              {packageUrl && (
                <div className="package-url">
                  <div className="url-section">
                    <span className="url-label">Public URL:</span>
                    <div className="url-container">
                      <input
                        type="text"
                        value={packageUrl}
                        readOnly
                        className="url-input"
                        title="Right-click to copy URL"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleCopyUrl(packageUrl);
                        }}
                      />
                      <button
                        className={`copy-btn ${isCopied ? 'copied' : ''}`}
                        onClick={() => handleCopyUrl(packageUrl)}
                        title="Copy URL to clipboard"
                      >
                        {isCopied ? (
                          <span className="copied-text">Copied!</span>
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="package-actions">
                {packageUrl && (
                  <a
                    href={packageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    title="Open URL in new tab"
                  >
                    <ExternalLink size={16} />
                    <span>Open</span>
                  </a>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => handleDownloadPackage(pkg)}
                  title="Download package file"
                >
                  <Package size={16} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};