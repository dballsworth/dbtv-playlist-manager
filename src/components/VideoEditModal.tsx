import React, { useState, useEffect } from 'react';
import { Save, X, Tag, Clock, HardDrive, Calendar } from 'lucide-react';
import { useVideoData } from '../hooks/useVideoData';
import type { Video } from '../types';

interface VideoEditModalProps {
  video: Video;
  onClose: () => void;
  onSave?: (video: Video) => void;
}

export const VideoEditModal: React.FC<VideoEditModalProps> = ({
  video,
  onClose,
  onSave
}) => {
  const { updateVideo } = useVideoData();
  const [formData, setFormData] = useState({
    title: video.title,
    tags: video.tags.join(', '),
    metadata: {
      resolution: video.metadata.resolution,
      codec: video.metadata.codec,
      bitrate: video.metadata.bitrate.toString()
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when video changes
  useEffect(() => {
    setFormData({
      title: video.title,
      tags: video.tags.join(', '),
      metadata: {
        resolution: video.metadata.resolution,
        codec: video.metadata.codec,
        bitrate: video.metadata.bitrate.toString()
      }
    });
    setErrors([]);
  }, [video]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }));
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];
    
    if (!formData.title.trim()) {
      newErrors.push('Title is required');
    }
    
    if (formData.metadata.bitrate && isNaN(Number(formData.metadata.bitrate))) {
      newErrors.push('Bitrate must be a number');
    }
    
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const updatedVideo = await updateVideo(video.id, {
        title: formData.title.trim(),
        tags: formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
        metadata: {
          resolution: formData.metadata.resolution || 'unknown',
          codec: formData.metadata.codec || 'unknown',
          bitrate: Number(formData.metadata.bitrate) || 0
        }
      });

      if (updatedVideo && onSave) {
        onSave(updatedVideo);
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving video:', err);
      setErrors(['Failed to save video metadata']);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-edit-modal">
      <div className="edit-modal-content">
        <div className="edit-modal-header">
          <h3>Edit Video Metadata</h3>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="edit-modal-body">
          {/* Video Info Summary */}
          <div className="video-info-summary">
            <div className="video-thumbnail-large">
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.title} />
              ) : video.r2Storage ? (
                <div className="thumbnail-placeholder">
                  <div>☁️</div>
                  <small>R2</small>
                </div>
              ) : (
                <div className="thumbnail-placeholder">🎬</div>
              )}
            </div>
            
            <div className="video-details">
              <div className="video-filename">{video.filename}</div>
              <div className="video-stats">
                <div className="stat-item">
                  <Clock size={14} />
                  <span>{formatDuration(video.duration)}</span>
                </div>
                <div className="stat-item">
                  <HardDrive size={14} />
                  <span>{formatFileSize(video.fileSize)}</span>
                </div>
                <div className="stat-item">
                  <Calendar size={14} />
                  <span>Added {video.dateAdded.toLocaleDateString()}</span>
                </div>
              </div>
              
              {video.r2Storage && (
                <div className="r2-info">
                  <strong>R2 Storage:</strong> {video.r2Storage.key}
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="validation-errors">
              {errors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}

          {/* Editable Fields */}
          <div className="edit-form">
            <div className="form-group">
              <label htmlFor="video-title">Title</label>
              <input
                id="video-title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="form-input"
                placeholder="Enter video title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="video-tags">
                <Tag size={16} />
                Tags (comma-separated)
              </label>
              <input
                id="video-tags"
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="form-input"
                placeholder="ambient, psychedelic, loop, etc."
              />
              <small className="form-hint">
                Separate tags with commas. Used for filtering and organization.
              </small>
            </div>

            <div className="form-section">
              <h4>Technical Metadata</h4>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="video-resolution">Resolution</label>
                  <input
                    id="video-resolution"
                    type="text"
                    value={formData.metadata.resolution}
                    onChange={(e) => handleMetadataChange('resolution', e.target.value)}
                    className="form-input"
                    placeholder="1920x1080"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="video-codec">Codec</label>
                  <input
                    id="video-codec"
                    type="text"
                    value={formData.metadata.codec}
                    onChange={(e) => handleMetadataChange('codec', e.target.value)}
                    className="form-input"
                    placeholder="h264"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="video-bitrate">Bitrate (kbps)</label>
                  <input
                    id="video-bitrate"
                    type="text"
                    value={formData.metadata.bitrate}
                    onChange={(e) => handleMetadataChange('bitrate', e.target.value)}
                    className="form-input"
                    placeholder="8000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="edit-modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner">⟳</div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};