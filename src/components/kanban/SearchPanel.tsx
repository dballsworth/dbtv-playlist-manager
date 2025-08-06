import React from 'react';
import { Search } from 'lucide-react';
import type { FilterCriteria, SortCriteria } from '../../types';

interface SearchPanelProps {
  filters: FilterCriteria;
  sortBy: SortCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  onSortChange: (sortBy: SortCriteria) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  filters,
  sortBy,
  onFiltersChange,
  onSortChange
}) => {
  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ ...filters, searchTerm });
  };

  const handleDurationRangeChange = (durationRange: FilterCriteria['durationRange']) => {
    onFiltersChange({ ...filters, durationRange });
  };

  return (
    <div className="search-panel">
      <div className="search-row">
        <div className="search-input-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search videos..."
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <select 
          className="filter-dropdown"
          value={filters.durationRange}
          onChange={(e) => handleDurationRangeChange(e.target.value as FilterCriteria['durationRange'])}
        >
          <option value="all">Any Duration</option>
          <option value="under2">Under 2 min</option>
          <option value="2to5">2-5 min</option>
          <option value="over5">Over 5 min</option>
        </select>
      </div>
      <div className="search-row">
        <select 
          className="filter-dropdown"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortCriteria)}
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="duration-asc">Shortest First</option>
          <option value="duration-desc">Longest First</option>
        </select>
      </div>
    </div>
  );
};