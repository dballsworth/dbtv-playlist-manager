import React, { useState, useEffect } from 'react';
import { PackageLoaderService, type SavedPackage } from '../../services/packageLoaderService';
import { useVideoData } from '../../hooks/useVideoData';
import { Download, FolderOpen, Package, Calendar, HardDrive, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface PackageBrowserProps {
  onPlaylistsImported: (count: number) => void;
}

export const PackageBrowser: React.FC<PackageBrowserProps> = ({ onPlaylistsImported }) => {
  const { videos, createPlaylist, addVideoToPlaylist } = useVideoData();
  const [packages, setPackages] = useState<SavedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingPackageKey, setLoadingPackageKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{ [key: string]: { success: boolean; message: string; details?: string } }>({});

  useEffect(() => {
    loadSavedPackages();
  }, []);

  const loadSavedPackages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await PackageLoaderService.listSavedPackages();
      if (result.error) {
        setError(result.error);
      } else {
        setPackages(result.packages);
        console.log(`📦 Loaded ${result.packages.length} saved packages for display`);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadConfig = async (pkg: SavedPackage) => {
    setLoadingPackageKey(pkg.r2Key);
    setImportResults(prev => ({ ...prev, [pkg.r2Key]: { success: false, message: 'Loading...' } }));

    try {
      console.log(`🔄 Loading config from package: ${pkg.packageName}`);
      
      // Load package structure
      const structureResult = await PackageLoaderService.loadPackageStructure(pkg.r2Key);
      if (structureResult.error || !structureResult.structure) {
        throw new Error(structureResult.error || 'Failed to load package structure');
      }

      const structure = structureResult.structure;
      console.log(`📂 Package structure loaded: ${structure.playlists.length} playlists`);

      // Import playlists
      const importResult = await PackageLoaderService.importPlaylistsFromPackage(structure, videos);
      
      if (importResult.success) {
        // Create the imported playlists and populate them with videos
        let importedCount = 0;
        
        for (const playlistData of importResult.importedPlaylists) {
          // Create playlist using the hook
          const createdPlaylist = createPlaylist(playlistData.name, playlistData.description);
          if (createdPlaylist) {
            // Add videos to the playlist asynchronously
            let addedVideoCount = 0;
            for (const videoId of playlistData.videoIds) {
              try {
                const success = await addVideoToPlaylist(createdPlaylist.id, videoId);
                if (success) {
                  addedVideoCount++;
                }
              } catch (error) {
                console.warn(`Failed to add video ${videoId} to playlist ${createdPlaylist.name}:`, error);
              }
            }
            
            importedCount++;
            console.log(`✅ Created playlist "${createdPlaylist.name}" with ${addedVideoCount}/${playlistData.videoIds.length} videos added`);
          }
        }

        const successMessage = `Successfully imported ${importedCount} playlists`;
        const details = importResult.missingVideos.length > 0 
          ? `Missing ${importResult.missingVideos.length} videos: ${importResult.missingVideos.slice(0, 3).join(', ')}${importResult.missingVideos.length > 3 ? '...' : ''}`
          : 'All videos found in repository';

        setImportResults(prev => ({ 
          ...prev, 
          [pkg.r2Key]: { 
            success: true, 
            message: successMessage,
            details
          } 
        }));

        onPlaylistsImported(importedCount);
        console.log(`✅ ${successMessage}. Missing videos: ${importResult.missingVideos.length}`);
      } else {
        const errorMessage = importResult.errors?.join(', ') || 'Import failed';
        setImportResults(prev => ({ 
          ...prev, 
          [pkg.r2Key]: { 
            success: false, 
            message: `Import failed: ${errorMessage}`
          } 
        }));
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load config';
      setImportResults(prev => ({ 
        ...prev, 
        [pkg.r2Key]: { 
          success: false, 
          message: `Error: ${errorMessage}`
        } 
      }));
    } finally {
      setLoadingPackageKey(null);
    }
  };

  const handleDownloadZip = async (pkg: SavedPackage) => {
    setDownloadingKey(pkg.r2Key);
    
    try {
      console.log(`⬇️ Downloading ZIP: ${pkg.packageName}`);
      const result = await PackageLoaderService.downloadPackage(pkg.r2Key);
      
      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }
      
      console.log(`✅ Download completed: ${pkg.filename}`);
    } catch (err) {
      console.error('Failed to download package:', err);
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setImportResults(prev => ({ 
        ...prev, 
        [pkg.r2Key]: { 
          success: false, 
          message: `Download error: ${errorMessage}`
        } 
      }));
    } finally {
      setDownloadingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="package-browser loading">
        <div className="loading-message">
          <Package className="loading-icon" />
          <span>Loading saved packages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="package-browser error">
        <div className="error-message">
          <AlertTriangle className="error-icon" />
          <span>Failed to load packages: {error}</span>
          <button onClick={loadSavedPackages} className="btn btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="package-browser empty">
        <div className="empty-message">
          <Package className="empty-icon" />
          <span>No saved packages found</span>
          <p>Packages you save will appear here for loading and downloading.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="package-browser">
      <div className="package-list">
        {packages.map((pkg) => {
          const isLoading = loadingPackageKey === pkg.r2Key;
          const isDownloading = downloadingKey === pkg.r2Key;
          const result = importResults[pkg.r2Key];

          return (
            <div key={pkg.r2Key} className="package-item">
              <div className="package-header">
                <div className="package-info">
                  <div className="package-name">
                    <Package size={20} />
                    <span>{pkg.packageName}</span>
                  </div>
                  <div className="package-metadata">
                    <div className="metadata-item">
                      <Calendar size={14} />
                      <span>{PackageLoaderService.formatDate(pkg.lastModified)}</span>
                    </div>
                    <div className="metadata-item">
                      <HardDrive size={14} />
                      <span>{PackageLoaderService.formatFileSize(pkg.size)}</span>
                    </div>
                    <div className="metadata-item">
                      <FileText size={14} />
                      <span>{pkg.filename}</span>
                    </div>
                  </div>
                </div>
                
                <div className="package-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleLoadConfig(pkg)}
                    disabled={isLoading || isDownloading}
                    title="Import playlist configurations into the current workspace"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen size={16} />
                        <span>Load Config</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownloadZip(pkg)}
                    disabled={isLoading || isDownloading}
                    title="Download the complete ZIP package"
                  >
                    {isDownloading ? (
                      <>
                        <div className="loading-spinner" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Download ZIP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {result && (
                <div className={`import-result ${result.success ? 'success' : 'error'}`}>
                  <div className="result-message">
                    {result.success ? (
                      <CheckCircle size={16} className="success-icon" />
                    ) : (
                      <AlertTriangle size={16} className="error-icon" />
                    )}
                    <span>{result.message}</span>
                  </div>
                  {result.details && (
                    <div className="result-details">{result.details}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="package-browser-footer">
        <button onClick={loadSavedPackages} className="btn btn-secondary">
          <Package size={16} />
          <span>Refresh List</span>
        </button>
      </div>
    </div>
  );
};