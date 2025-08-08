import React, { useState, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader, File } from 'lucide-react';
import { r2Client } from '../services/r2Client';
import { useSettings } from '../hooks/useSettings';
import { useVideoData } from '../hooks/useVideoData';
import { ThumbnailGenerator } from '../utils/thumbnailGenerator';
import { DurationExtractor } from '../utils/durationExtractor';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'generating-thumbnail' | 'uploading' | 'completed' | 'error';
  error?: string;
  r2Key?: string;
  thumbnailR2Key?: string;
  thumbnailDataUrl?: string;
  videoDuration?: number; // Duration in seconds extracted from video
}

interface VideoUploadProps {
  onUploadComplete?: (uploads: UploadFile[]) => void;
  onClose?: () => void;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadComplete,
  onClose
}) => {
  const { settings, isR2Configured } = useSettings();
  const { createVideoFromUpload } = useVideoData();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Supported video formats
  const SUPPORTED_FORMATS = [
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
    'video/webm', 'video/ogg', 'video/3gpp', 'video/x-flv'
  ];
  
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  const validateFiles = (files: FileList | File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach(file => {
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        errors.push(`${file.name}: Unsupported video format`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 500MB)`);
        return;
      }
      
      valid.push(file);
    });
    
    return { valid, errors };
  };

  const generateR2Key = (filename: string): string => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const randomId = Math.random().toString(36).substring(2, 8);
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `videos/${timestamp}/${randomId}_${sanitizedName}`;
  };

  const addFiles = async (files: FileList | File[]) => {
    const { valid, errors } = validateFiles(files);
    
    if (errors.length > 0) {
      alert('Upload errors:\n' + errors.join('\n'));
    }
    
    const newUploads: UploadFile[] = valid.map(file => {
      const r2Key = generateR2Key(file.name);
      return {
        id: Math.random().toString(36).substring(2),
        file,
        progress: 0,
        status: 'pending',
        r2Key
      };
    });
    
    setUploads(prev => [...prev, ...newUploads]);
    
    // Generate thumbnails for the new uploads
    generateThumbnailsForUploads(newUploads);
  };

  const generateThumbnailsForUploads = async (uploads: UploadFile[]) => {
    for (const upload of uploads) {
      try {
        // Update status to generating thumbnail
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'generating-thumbnail' }
            : u
        ));

        console.log(`🎬 Generating thumbnail for ${upload.file.name}...`);
        console.log(`📁 Video R2 key: ${upload.r2Key}`);
        
        const result = await ThumbnailGenerator.generateThumbnail(upload.file, {
          targetWidth: 600,
          quality: 0.98,
          format: 'jpeg'
        });

        console.log(`📸 [VideoUpload] Thumbnail generation result for ${upload.file.name}:`, { 
          success: result.success, 
          hasDataUrl: !!result.dataUrl, 
          error: result.error,
          dimensions: `${result.width}x${result.height}`,
          videoDuration: result.videoDuration,
          videoDurationType: typeof result.videoDuration
        });

        if (result.success && result.dataUrl) {
          // Use the pre-generated R2 key for thumbnail
          const thumbnailR2Key = ThumbnailGenerator.generateThumbnailR2Key(upload.r2Key!, 'jpeg');
          console.log(`📁 Thumbnail R2 key: ${thumbnailR2Key}`);
          console.log(`⏱️ [VideoUpload] Video duration captured: ${result.videoDuration}s (type: ${typeof result.videoDuration})`);

          setUploads(prev => prev.map(u => 
            u.id === upload.id 
              ? { 
                  ...u, 
                  status: 'pending', 
                  thumbnailDataUrl: result.dataUrl,
                  thumbnailR2Key,
                  videoDuration: result.videoDuration
                }
              : u
          ));
          
          console.log(`✅ Thumbnail generated successfully for ${upload.file.name}${result.videoDuration ? `, duration: ${result.videoDuration}s` : ''}`);
        } else {
          console.error(`❌ Failed to generate thumbnail for ${upload.file.name}:`, result.error);
          
          // If thumbnail generation failed but didn't capture duration, try fallback extraction
          let finalDuration = result.videoDuration;
          if (!finalDuration) {
            console.log(`🔄 Attempting fallback duration extraction for ${upload.file.name}...`);
            try {
              finalDuration = await DurationExtractor.extractDuration(upload.file);
              console.log(`⏱️ Fallback duration extraction result: ${finalDuration}s`);
            } catch (error) {
              console.warn(`⚠️ Fallback duration extraction failed for ${upload.file.name}:`, error);
            }
          }
          
          // Still set back to pending so video can be uploaded without thumbnail
          // But capture duration if available even when thumbnail generation failed
          setUploads(prev => prev.map(u => 
            u.id === upload.id 
              ? { 
                  ...u, 
                  status: 'pending', 
                  error: `Thumbnail generation failed: ${result.error}`,
                  videoDuration: finalDuration
                }
              : u
          ));
        }
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${upload.file.name}:`, error);
        
        // Try fallback duration extraction even when thumbnail generation completely failed
        let fallbackDuration: number | undefined = undefined;
        try {
          console.log(`🔄 Attempting fallback duration extraction after error for ${upload.file.name}...`);
          fallbackDuration = await DurationExtractor.extractDuration(upload.file);
          console.log(`⏱️ Fallback duration extraction result: ${fallbackDuration}s`);
        } catch (durationError) {
          console.warn(`⚠️ Fallback duration extraction also failed for ${upload.file.name}:`, durationError);
        }
        
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'pending', videoDuration: fallbackDuration }
            : u
        ));
      }
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  };

  const uploadFile = async (upload: UploadFile): Promise<void> => {
    // Use the pre-generated R2 key
    const r2Key = upload.r2Key!;
    
    setUploads(prev => prev.map(u => 
      u.id === upload.id 
        ? { ...u, status: 'uploading', progress: 0 }
        : u
    ));

    try {
      // Configure R2 client if not already configured
      if (!r2Client.isConfigured()) {
        r2Client.configure(settings.cloudStorage.r2);
      }

      // Upload video file
      const videoResult = await r2Client.uploadFile(
        r2Key,
        upload.file,
        {
          contentType: upload.file.type,
          metadata: {
            originalFilename: upload.file.name,
            uploadDate: new Date().toISOString(),
            fileSize: upload.file.size.toString()
          },
          onProgress: (progress) => {
            setUploads(prev => prev.map(u => 
              u.id === upload.id ? { ...u, progress: progress * 0.8 } : u // Reserve 20% for thumbnail
            ));
          }
        }
      );

      if (!videoResult.success) {
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error', error: videoResult.error || 'Video upload failed' }
            : u
        ));
        return;
      }

      // Upload thumbnail if available and wait for completion
      let thumbnailUploadSuccess = false;
      if (upload.thumbnailDataUrl && upload.thumbnailR2Key) {
        try {
          console.log(`📤 Uploading thumbnail to R2: ${upload.thumbnailR2Key}`);
          
          // Convert data URL to blob, then to ArrayBuffer for R2 upload
          const response = await fetch(upload.thumbnailDataUrl);
          const thumbnailBlob = await response.blob();
          console.log(`📦 Thumbnail blob size: ${thumbnailBlob.size} bytes`);
          
          // Convert Blob to ArrayBuffer (required by r2Client.uploadFile)
          const thumbnailArrayBuffer = await thumbnailBlob.arrayBuffer();
          console.log(`🔄 Converted to ArrayBuffer: ${thumbnailArrayBuffer.byteLength} bytes`);
          
          const thumbnailResult = await r2Client.uploadFile(
            upload.thumbnailR2Key,
            thumbnailArrayBuffer,
            {
              contentType: 'image/jpeg',
              metadata: {
                originalVideoFilename: upload.file.name,
                generatedAt: new Date().toISOString(),
                thumbnailWidth: '150'
              }
            }
          );

          if (thumbnailResult.success) {
            console.log(`✅ Thumbnail uploaded successfully to R2: ${upload.thumbnailR2Key}`);
            thumbnailUploadSuccess = true;
          } else {
            console.error(`❌ Thumbnail upload failed:`, thumbnailResult.error);
          }
        } catch (thumbnailError) {
          console.error(`❌ Thumbnail upload error:`, thumbnailError);
        }
      } else {
        console.warn(`⚠️ No thumbnail to upload for ${upload.file.name}`, {
          hasThumbnailDataUrl: !!upload.thumbnailDataUrl,
          hasThumbnailR2Key: !!upload.thumbnailR2Key
        });
      }

      // Update progress to 100%
      setUploads(prev => prev.map(u => 
        u.id === upload.id ? { ...u, progress: 100 } : u
      ));

      console.log(`🎬 Creating video record after both uploads completed`);
      
      // Create video record in the service AFTER both video and thumbnail uploads
      console.log(`📽️ [VideoUpload] Creating video record with duration: ${upload.videoDuration}s for ${upload.file.name}`);
      await createVideoFromUpload({
        id: upload.id,
        file: upload.file,
        r2Key,
        thumbnailR2Key: thumbnailUploadSuccess ? upload.thumbnailR2Key : undefined,
        videoDuration: upload.videoDuration
      });

      setUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? { ...u, status: 'completed', progress: 100 }
          : u
      ));
    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? { ...u, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : u
      ));
    }
  };

  const startUploads = async () => {
    if (!isR2Configured) {
      alert('Please configure R2 storage in Settings first');
      return;
    }

    const pendingUploads = uploads.filter(u => u.status === 'pending');
    if (pendingUploads.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files sequentially to avoid overwhelming the connection
      for (const upload of pendingUploads) {
        await uploadFile(upload);
      }
      
      // Notify parent component of completed uploads
      const completedUploads = uploads.filter(u => u.status === 'completed');
      if (completedUploads.length > 0 && onUploadComplete) {
        onUploadComplete(completedUploads);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, []);

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return <File className="upload-status-icon pending" size={16} />;
      case 'generating-thumbnail': return <Loader className="upload-status-icon generating" size={16} />;
      case 'uploading': return <Loader className="upload-status-icon uploading" size={16} />;
      case 'completed': return <CheckCircle className="upload-status-icon completed" size={16} />;
      case 'error': return <AlertCircle className="upload-status-icon error" size={16} />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const pendingCount = uploads.filter(u => u.status === 'pending').length;

  return (
    <div className="video-upload-modal">
      <div className="upload-modal-content">
        <div className="upload-modal-header">
          <h3>Upload Videos to R2</h3>
          {onClose && (
            <button onClick={onClose} className="modal-close-btn">
              <X size={20} />
            </button>
          )}
        </div>

        {!isR2Configured && (
          <div className="upload-warning">
            <AlertCircle size={16} />
            <span>R2 storage is not configured. Please configure it in Settings first.</span>
          </div>
        )}

        <div 
          className={`upload-drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload size={48} />
          <h4>Drag & Drop Videos Here</h4>
          <p>or</p>
          <label className="upload-file-btn">
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileSelect}
              disabled={!isR2Configured}
            />
            Choose Files
          </label>
          <small>
            Supported: MP4, MOV, AVI, WebM, etc. (Max 500MB per file)
          </small>
        </div>

        {uploads.length > 0 && (
          <div className="upload-list">
            <div className="upload-list-header">
              <h4>Upload Queue ({uploads.length} files)</h4>
              <div className="upload-stats">
                {completedCount > 0 && <span className="stat completed">{completedCount} completed</span>}
                {errorCount > 0 && <span className="stat error">{errorCount} failed</span>}
                {pendingCount > 0 && <span className="stat pending">{pendingCount} pending</span>}
              </div>
            </div>

            <div className="upload-items">
              {uploads.map(upload => (
                <div key={upload.id} className={`upload-item ${upload.status}`}>
                  <div className="upload-item-info">
                    {upload.thumbnailDataUrl ? (
                      <div className="upload-thumbnail">
                        <img src={upload.thumbnailDataUrl} alt="Thumbnail" />
                      </div>
                    ) : (
                      getStatusIcon(upload.status)
                    )}
                    <div className="upload-item-details">
                      <div className="upload-item-name">{upload.file.name}</div>
                      <div className="upload-item-meta">
                        {formatFileSize(upload.file.size)}
                        {upload.status === 'generating-thumbnail' && ' • Generating thumbnail...'}
                        {upload.status === 'uploading' && ` • ${upload.progress}%`}
                        {upload.error && ` • ${upload.error}`}
                      </div>
                    </div>
                  </div>

                  {upload.status === 'uploading' && (
                    <div className="upload-progress">
                      <div 
                        className="upload-progress-bar"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}

                  {(upload.status === 'pending' || upload.status === 'error') && (
                    <button 
                      onClick={() => removeUpload(upload.id)}
                      className="upload-remove-btn"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="upload-actions">
              <button
                onClick={startUploads}
                disabled={!isR2Configured || isUploading || pendingCount === 0}
                className="btn btn-primary"
              >
                {isUploading ? (
                  <>
                    <Loader size={16} />
                    Uploading...
                  </>
                ) : (
                  `Upload ${pendingCount} Files`
                )}
              </button>

              <button
                onClick={() => setUploads(prev => prev.filter(u => u.status !== 'pending'))}
                disabled={isUploading || pendingCount === 0}
                className="btn btn-secondary"
              >
                Clear Pending
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};