/**
 * Utility functions for drag and drop operations
 */

/**
 * Creates a unique drag ID by combining context with video ID
 * This ensures that the same video in different contexts (repository vs different playlists)
 * can be dragged independently
 */
export const createDragId = (
  videoId: string,
  sourceType: 'repository' | 'playlist' = 'repository',
  sourceId?: string
): string => {
  const contextId = sourceType === 'playlist' ? sourceId || 'unknown' : 'repo';
  return `${sourceType}:${contextId}:${videoId}`;
};

/**
 * Extracts the original video ID from a context-aware drag ID
 */
export const extractVideoId = (dragId: string): string => {
  // Format: "sourceType:contextId:videoId"
  const lastColonIndex = dragId.lastIndexOf(':');
  if (lastColonIndex === -1) return dragId;
  
  return dragId.substring(lastColonIndex + 1);
};

/**
 * Extracts source information from a context-aware drag ID
 */
export const extractSourceInfo = (dragId: string): {
  sourceType: 'repository' | 'playlist';
  sourceId?: string;
} => {
  const parts = dragId.split(':');
  const sourceType = parts[0] as 'repository' | 'playlist';
  const sourceId = sourceType === 'playlist' ? parts[1] : undefined;
  
  return { sourceType, sourceId };
};