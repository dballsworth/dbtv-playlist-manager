import { useState, useCallback } from 'react';

export const useVideoSelection = () => {
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  const toggleVideoSelection = useCallback((videoId: string) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((videoIds: string[]) => {
    setSelectedVideoIds(new Set(videoIds));
  }, []);

  const selectNone = useCallback(() => {
    setSelectedVideoIds(new Set());
  }, []);

  const isSelected = useCallback((videoId: string) => {
    return selectedVideoIds.has(videoId);
  }, [selectedVideoIds]);

  const getSelectedCount = useCallback(() => {
    return selectedVideoIds.size;
  }, [selectedVideoIds]);

  const getSelectedIds = useCallback(() => {
    return Array.from(selectedVideoIds);
  }, [selectedVideoIds]);

  return {
    selectedVideoIds,
    toggleVideoSelection,
    selectAll,
    selectNone,
    isSelected,
    getSelectedCount,
    getSelectedIds
  };
};