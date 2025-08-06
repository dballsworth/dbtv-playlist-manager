import React, { useState } from 'react';
import { VideoCard } from './VideoCard';
import { SearchPanel } from './SearchPanel';
import { BulkActionsToolbar } from '../BulkActionsToolbar';
import { VideoEditModal } from '../VideoEditModal';
import { useVideoSelection } from '../../hooks/useVideoSelection';
import { useVideoData } from '../../hooks/useVideoData';
import type { Video, FilterCriteria, SortCriteria } from '../../types';
import { Folder } from 'lucide-react';

interface RepositoryColumnProps {
  videos: Video[];
}

export const RepositoryColumn: React.FC<RepositoryColumnProps> = ({ videos }) => {
  const { playlists, deleteVideo, addVideoToPlaylist, createPlaylist, retryR2Deletion, isLoading, error } = useVideoData();
  const {
    isSelected,
    toggleVideoSelection,
    selectNone,
    getSelectedCount,
    getSelectedIds
  } = useVideoSelection();
  
  const [filters, setFilters] = useState<FilterCriteria>({
    searchTerm: '',
    tags: [],
    durationRange: 'all',
    dateRange: 'all',
    usageStatus: 'all'
  });
  const [sortBy, setSortBy] = useState<SortCriteria>('date-desc');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const filteredVideos = videos.filter(video => {
    // Search term filter
    if (filters.searchTerm && !video.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }

    // Tags filter
    if (filters.tags.length > 0 && !filters.tags.some(tag => video.tags.includes(tag))) {
      return false;
    }

    // Duration filter
    if (filters.durationRange !== 'all') {
      const minutes = video.duration / 60;
      switch (filters.durationRange) {
        case 'under2':
          if (minutes >= 2) return false;
          break;
        case '2to5':
          if (minutes < 2 || minutes > 5) return false;
          break;
        case 'over5':
          if (minutes <= 5) return false;
          break;
      }
    }

    return true;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'date-asc':
        return a.dateAdded.getTime() - b.dateAdded.getTime();
      case 'date-desc':
        return b.dateAdded.getTime() - a.dateAdded.getTime();
      case 'duration-asc':
        return a.duration - b.duration;
      case 'duration-desc':
        return b.duration - a.duration;
      default:
        return 0;
    }
  });

  // Single video deletion with enhanced error handling
  const handleDeleteVideo = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    try {
      const result = await deleteVideo(videoId);
      
      if (result.success) {
        if (result.error) {
          // Video deleted locally but R2 deletion failed
          alert(`⚠️ Warning: ${result.error}\n\nThe video has been removed from your library, but the file still exists in cloud storage. You may want to manually clean it up from your Cloudflare R2 dashboard.`);
        } else {
          // Full success
          const status = video.r2Storage 
            ? 'Video deleted from library and cloud storage ✓'
            : 'Video deleted from library ✓';
          console.log(status);
        }
      } else {
        // Deletion failed - offer retry or force delete options
        const choice = confirm(`❌ ${result.error}\n\nChoose an option:\n- OK: Retry deletion\n- Cancel: Remove from library only`);
        
        if (choice) {
          // User chose to retry
          try {
            const retryResult = await retryR2Deletion(videoId);
            if (retryResult.success) {
              // Now try deleting the video again
              const deleteResult = await deleteVideo(videoId);
              if (deleteResult.success) {
                alert('✓ Video successfully deleted after retry!');
              }
            } else {
              // Retry failed, ask if they want to force delete
              const forceDelete = confirm(`Retry failed: ${retryResult.error}\n\nWould you like to remove the video from your library anyway? The file will remain in cloud storage.`);
              if (forceDelete) {
                const forceResult = await deleteVideo(videoId, true);
                if (forceResult.success) {
                  alert(`⚠️ Video removed from library only.\n\nThe file still exists in cloud storage and should be cleaned up manually.`);
                }
              }
            }
          } catch (error) {
            alert(`Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // User chose to force delete
          const forceResult = await deleteVideo(videoId, true);
          if (forceResult.success) {
            alert(`⚠️ Video removed from library only.\n\nThe file still exists in cloud storage and should be cleaned up manually from your Cloudflare R2 dashboard.`);
          }
        }
      }
    } catch (error) {
      alert(`Error deleting video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Bulk action handlers
  const handleDeleteSelected = async () => {
    const selectedIds = getSelectedIds();
    let successCount = 0;
    let partialCount = 0;
    let failedCount = 0;
    
    for (const videoId of selectedIds) {
      try {
        const result = await deleteVideo(videoId);
        if (result.success) {
          if (result.error) partialCount++;
          else successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
      }
    }
    
    selectNone();
    
    // Show summary
    let message = `Bulk deletion complete:\n• ${successCount} fully deleted\n• ${partialCount} deleted locally (R2 files remain)\n• ${failedCount} failed`;
    
    if (partialCount > 0 || failedCount > 0) {
      message += '\n\nFiles remaining in cloud storage should be cleaned up manually.';
    }
    
    alert(message);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    const selectedIds = getSelectedIds();
    for (const videoId of selectedIds) {
      await addVideoToPlaylist(playlistId, videoId);
    }
    selectNone();
  };

  const handleCreatePlaylist = async (name: string, selectedIds: string[]) => {
    const playlist = createPlaylist(name);
    if (playlist) {
      const videosToAdd = selectedIds.length > 0 ? selectedIds : getSelectedIds();
      for (const videoId of videosToAdd) {
        await addVideoToPlaylist(playlist.id, videoId);
      }
    }
    selectNone();
  };

  return (
    <div className="kanban-column repository-column">
      <div className="column-header repository-header">
        <span>
          <Folder size={16} className="inline mr-2" />
          Repository ({sortedVideos.length})
        </span>
      </div>
      <div className="column-content">
        <SearchPanel 
          filters={filters}
          sortBy={sortBy}
          onFiltersChange={setFilters}
          onSortChange={setSortBy}
        />
        
        <BulkActionsToolbar
          selectedCount={getSelectedCount()}
          playlists={playlists}
          onDeleteSelected={handleDeleteSelected}
          onAddToPlaylist={handleAddToPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
          onClearSelection={selectNone}
        />
        
        <div className="video-list">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading videos from R2 storage...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>❌ Failed to load videos: {error}</p>
              <button onClick={() => window.location.reload()} className="btn btn-secondary">
                Retry
              </button>
            </div>
          ) : sortedVideos.length === 0 ? (
            <div className="empty-state">
              <p>📁 No videos found in R2 storage</p>
              <small>Upload videos to see them here</small>
            </div>
          ) : (
            sortedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isCompact
                sourceType="repository"
                onDelete={handleDeleteVideo}
                onEdit={setEditingVideo}
                isSelected={isSelected(video.id)}
                onToggleSelection={toggleVideoSelection}
              />
            ))
          )}
        </div>
      </div>
      
      {editingVideo && (
        <VideoEditModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onSave={(updatedVideo) => {
            console.log('Video updated:', updatedVideo);
            setEditingVideo(null);
          }}
        />
      )}
    </div>
  );
};