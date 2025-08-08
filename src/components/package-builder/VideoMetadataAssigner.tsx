import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Video } from '../../types';

type VideoMood = 'ambient' | 'high-energy' | 'psychedelic';
type VideoCategory = 'background_visuals' | 'performance_visuals' | 'ambient_visuals';

interface VideoAssignment {
  videoId: string;
  mood: VideoMood;
  category: VideoCategory;
}

interface VideoMetadataAssignerProps {
  videos: Video[];
  assignments: VideoAssignment[];
  onAssignmentChange: (videoId: string, mood: VideoMood, category: VideoCategory) => void;
  onBulkAssignment: (mood: VideoMood, category: VideoCategory) => void;
}

export const VideoMetadataAssigner: React.FC<VideoMetadataAssignerProps> = ({
  videos,
  assignments,
  onAssignmentChange,
  onBulkAssignment
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [bulkMood, setBulkMood] = useState<VideoMood>('ambient');
  const [bulkCategory, setBulkCategory] = useState<VideoCategory>('background_visuals');

  const getAssignment = (videoId: string): VideoAssignment => {
    return assignments.find(a => a.videoId === videoId) || {
      videoId,
      mood: 'ambient',
      category: 'background_visuals'
    };
  };

  const handleBulkApply = () => {
    onBulkAssignment(bulkMood, bulkCategory);
  };

  const moodOptions: { value: VideoMood; label: string }[] = [
    { value: 'ambient', label: 'Ambient' },
    { value: 'high-energy', label: 'High Energy' },
    { value: 'psychedelic', label: 'Psychedelic' }
  ];

  const categoryOptions: { value: VideoCategory; label: string }[] = [
    { value: 'background_visuals', label: 'Background Visuals' },
    { value: 'performance_visuals', label: 'Performance Visuals' },
    { value: 'ambient_visuals', label: 'Ambient Visuals' }
  ];

  return (
    <div className="video-metadata-assigner">
      <div 
        className="assigner-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>DBTV Metadata Assignment</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {isExpanded && (
        <div className="assigner-content">
          <div className="bulk-assignment">
            <div className="bulk-controls">
              <select 
                value={bulkMood} 
                onChange={(e) => setBulkMood(e.target.value as VideoMood)}
                className="bulk-select"
              >
                {moodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <select 
                value={bulkCategory} 
                onChange={(e) => setBulkCategory(e.target.value as VideoCategory)}
                className="bulk-select"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <button onClick={handleBulkApply} className="btn btn-secondary bulk-apply">
                Apply to All
              </button>
            </div>
          </div>

          <div className="video-assignments">
            {videos.map((video) => {
              const assignment = getAssignment(video.id);
              return (
                <div key={video.id} className="video-assignment">
                  <div className="video-info">
                    <div className="video-title">{video.title}</div>
                  </div>
                  
                  <div className="assignment-controls">
                    <select 
                      value={assignment.mood}
                      onChange={(e) => onAssignmentChange(video.id, e.target.value as VideoMood, assignment.category)}
                      className="assignment-select"
                    >
                      {moodOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    <select 
                      value={assignment.category}
                      onChange={(e) => onAssignmentChange(video.id, assignment.mood, e.target.value as VideoCategory)}
                      className="assignment-select"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export type { VideoAssignment, VideoMood, VideoCategory };