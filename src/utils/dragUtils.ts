/**
 * Utility functions for drag and drop operations
 */

/**
 * Extracts the original video ID from a drag ID
 * Handles both simple IDs and complex context-aware IDs
 */
export const extractVideoId = (dragId: string): string => {
  // For new simplified format: "repository:videoId" or "playlist:playlistId:videoId"
  const lastColonIndex = dragId.lastIndexOf(':');
  if (lastColonIndex === -1) return dragId;
  
  return dragId.substring(lastColonIndex + 1);
};

/**
 * Extracts drag context from a drag ID
 */
export const extractDragContext = (dragId: string): {
  sourceType: 'repository' | 'playlist';
  sourceId?: string;
  videoId: string;
} => {
  const parts = dragId.split(':');
  
  if (parts.length === 2 && parts[0] === 'repository') {
    return {
      sourceType: 'repository',
      videoId: parts[1]
    };
  }
  
  if (parts.length === 3 && parts[0] === 'playlist') {
    return {
      sourceType: 'playlist',
      sourceId: parts[1],
      videoId: parts[2]
    };
  }
  
  // Fallback for malformed IDs
  return {
    sourceType: 'repository',
    videoId: dragId
  };
};