import React, { useState, useEffect } from 'react';
import { WorkingArea } from './WorkingArea';
import { useVideoData } from '../../hooks/useVideoData';
import { ZipService } from '../../services/zipService';
import { ExportService } from '../../services/exportService';

// Generate auto timestamp for package name
const generatePackageName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  return `Package-${year}-${month}-${day}-${hour}-${minute}`;
};

export const PackageBuilder: React.FC = () => {
  const { videos, playlists } = useVideoData();
  const [packageName, setPackageName] = useState('');
  const [exportProgress, setExportProgress] = useState<{
    isExporting: boolean;
    progress: number;
    currentFile: string;
  }>({ isExporting: false, progress: 0, currentFile: '' });

  const [saveProgress, setSaveProgress] = useState<{
    isSaving: boolean;
    progress: number;
    currentFile: string;
  }>({ isSaving: false, progress: 0, currentFile: '' });

  // Auto-generate package name on mount
  useEffect(() => {
    setPackageName(generatePackageName());
  }, []);

  // Filter out empty playlists (playlists with no actual existing videos)
  const nonEmptyPlaylists = playlists.filter(playlist => 
    videos.filter(v => playlist.videoIds.includes(v.id)).length > 0
  );

  // Get all videos from all non-empty playlists
  const getAllPackageVideos = () => {
    const allVideoIds = new Set(nonEmptyPlaylists.flatMap(p => p.videoIds));
    return videos.filter(v => allVideoIds.has(v.id));
  };

  const calculatePackageStats = () => {
    const packageVideos = getAllPackageVideos();
    const totalSize = packageVideos.reduce((sum, video) => sum + video.fileSize, 0);
    
    return {
      totalVideos: packageVideos.length,
      totalPlaylists: nonEmptyPlaylists.length,
      totalSize
    };
  };

  const handleExport = async () => {
    if (exportProgress.isExporting) return;
    
    const packageVideos = getAllPackageVideos();
    
    // Basic validation
    if (packageVideos.length === 0) {
      alert('No videos found in playlists. Please add videos to your playlists first.');
      return;
    }

    if (nonEmptyPlaylists.length === 0) {
      alert('No playlists found. Please create playlists with videos first.');
      return;
    }

    // Validate playlist integrity and warn about missing videos
    const validationIssues: string[] = [];
    let totalMissingVideos = 0;

    nonEmptyPlaylists.forEach(playlist => {
      const validation = ExportService.validatePlaylistIntegrity(playlist, videos);
      if (!validation.isValid) {
        totalMissingVideos += validation.missingVideoIds.length;
        validationIssues.push(`• ${playlist.name}: ${validation.missingVideoIds.length} missing videos`);
      }
    });

    // Show warning if there are missing videos
    if (validationIssues.length > 0) {
      const warningMessage = [
        `Warning: Found ${totalMissingVideos} missing video references:`,
        ...validationIssues,
        '',
        'These videos will be automatically excluded from the export.',
        'Do you want to continue?'
      ].join('\n');

      if (!confirm(warningMessage)) {
        return;
      }
    }

    try {
      setExportProgress({ isExporting: true, progress: 0, currentFile: 'Preparing export...' });
      
      const result = await ZipService.exportPackageWithR2(
        packageName || 'untitled-package',
        packageVideos,
        nonEmptyPlaylists,
        (progress: { completed: number; total: number; currentFile: string }) => {
          setExportProgress({
            isExporting: true,
            progress: progress.completed,
            currentFile: progress.currentFile
          });
        }
      );
      
      // Show R2 upload result if relevant
      if (result.success && result.r2Key) {
        console.log(`✅ Package also saved to R2: ${result.r2Key}`);
      } else if (result.error) {
        console.warn(`⚠️ R2 upload failed: ${result.error}`);
      }
      
      setExportProgress({ isExporting: false, progress: 100, currentFile: 'Export completed!' });
      
      // Reset progress after a short delay
      setTimeout(() => {
        setExportProgress({ isExporting: false, progress: 0, currentFile: '' });
      }, 2000);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setExportProgress({ isExporting: false, progress: 0, currentFile: '' });
    }
  };

  const handleSave = async () => {
    if (saveProgress.isSaving) return;
    
    const packageVideos = getAllPackageVideos();
    
    // Basic validation
    if (packageVideos.length === 0) {
      alert('No videos found in playlists. Please add videos to your playlists first.');
      return;
    }

    if (nonEmptyPlaylists.length === 0) {
      alert('No playlists found. Please create playlists with videos first.');
      return;
    }

    // Validation (same as export)
    const validationIssues: string[] = [];
    let totalMissingVideos = 0;

    nonEmptyPlaylists.forEach(playlist => {
      const validation = ExportService.validatePlaylistIntegrity(playlist, videos);
      if (!validation.isValid) {
        totalMissingVideos += validation.missingVideoIds.length;
        validationIssues.push(`• ${playlist.name}: ${validation.missingVideoIds.length} missing videos`);
      }
    });

    // Show warning if there are missing videos
    if (validationIssues.length > 0) {
      const warningMessage = [
        `Warning: Found ${totalMissingVideos} missing video references:`,
        ...validationIssues,
        '',
        'These videos will be automatically excluded from the package.',
        'Do you want to continue?'
      ].join('\n');

      if (!confirm(warningMessage)) {
        return;
      }
    }

    try {
      setSaveProgress({ isSaving: true, progress: 0, currentFile: 'Preparing save...' });
      
      const result = await ZipService.savePackageToR2(
        packageName || 'untitled-package',
        packageVideos,
        nonEmptyPlaylists,
        (progress: { completed: number; total: number; currentFile: string }) => {
          setSaveProgress({
            isSaving: true,
            progress: progress.completed,
            currentFile: progress.currentFile
          });
        }
      );
      
      if (result.success) {
        setSaveProgress({ isSaving: false, progress: 100, currentFile: 'Package saved to R2!' });
        
        // Show success message with details
        const successMessage = result.publicUrl
          ? `Package saved successfully to R2!\n\nStorage path: ${result.r2Key}\nPublic URL: ${result.publicUrl}`
          : `Package saved successfully to R2!\n\nStorage path: ${result.r2Key}`;
        
        alert(successMessage);
        
        // Reset progress after a short delay
        setTimeout(() => {
          setSaveProgress({ isSaving: false, progress: 0, currentFile: '' });
        }, 2000);
      } else {
        throw new Error(result.error || 'Save failed');
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSaveProgress({ isSaving: false, progress: 0, currentFile: '' });
    }
  };

  const stats = calculatePackageStats();

  return (
    <div className="package-builder">
      <div className="packaging-layout">
        <WorkingArea
          playlists={nonEmptyPlaylists}
          videos={getAllPackageVideos()}
          packageName={packageName}
          stats={stats}
          exportProgress={exportProgress}
          saveProgress={saveProgress}
          onPackageNameChange={setPackageName}
          onSave={handleSave}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};