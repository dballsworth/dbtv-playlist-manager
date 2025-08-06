import React, { useState } from 'react';
import { SelectionPanel } from './SelectionPanel';
import { WorkingArea } from './WorkingArea';
import { useMockData } from '../../hooks/useMockData';

export const PackageBuilder: React.FC = () => {
  const { videos, playlists } = useMockData();
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [packageName, setPackageName] = useState('');
  const [activeTab, setActiveTab] = useState<'playlists' | 'videos'>('playlists');

  const handlePlaylistToggle = (playlistId: string) => {
    setSelectedPlaylists(prev =>
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handleVideoToggle = (videoId: string) => {
    setSelectedVideos(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleRemovePlaylist = (playlistId: string) => {
    setSelectedPlaylists(prev => prev.filter(id => id !== playlistId));
  };

  const handleRemoveVideo = (videoId: string) => {
    setSelectedVideos(prev => prev.filter(id => id !== videoId));
  };

  const calculatePackageStats = () => {
    const selectedPlaylistObjs = playlists.filter(p => selectedPlaylists.includes(p.id));
    const allVideoIds = new Set([
      ...selectedVideos,
      ...selectedPlaylistObjs.flatMap(p => p.videoIds)
    ]);
    
    const uniqueVideos = videos.filter(v => allVideoIds.has(v.id));
    const totalSize = uniqueVideos.reduce((sum, video) => sum + video.fileSize, 0);
    
    return {
      totalVideos: uniqueVideos.length,
      totalPlaylists: selectedPlaylists.length,
      totalSize
    };
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting package:', {
      name: packageName,
      playlists: selectedPlaylists,
      videos: selectedVideos
    });
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving package:', {
      name: packageName,
      playlists: selectedPlaylists,
      videos: selectedVideos
    });
  };

  const stats = calculatePackageStats();

  return (
    <div className="package-builder">
      <div className="packaging-layout">
        <SelectionPanel
          playlists={playlists}
          videos={videos}
          selectedPlaylists={selectedPlaylists}
          selectedVideos={selectedVideos}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPlaylistToggle={handlePlaylistToggle}
          onVideoToggle={handleVideoToggle}
        />
        
        <WorkingArea
          playlists={playlists.filter(p => selectedPlaylists.includes(p.id))}
          videos={videos.filter(v => selectedVideos.includes(v.id))}
          packageName={packageName}
          stats={stats}
          onPackageNameChange={setPackageName}
          onRemovePlaylist={handleRemovePlaylist}
          onRemoveVideo={handleRemoveVideo}
          onSave={handleSave}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};