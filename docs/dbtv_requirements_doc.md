# DBTV Playlist Manager - Business Requirements Document

## Executive Summary

The DBTV Playlist Manager is a desktop web application designed to manage video content for the Dickens & Ballsworth "DBTV" performance system. It provides a visual, Kanban-style interface for organizing videos into playlists and creating deployable content packages for Raspberry Pi devices used in live performances.

## Project Context

DBTV is a multi-device video system that enhances live music performances with synchronized visual content across multiple displays. The system operates in two primary modes:
- **Performance Mode**: Visual enhancement during live sets with mood-based playlists
- **Set Break Mode**: Interactive audience engagement content between sets

The Playlist Manager serves as the content management hub, working in concert with existing DBTV components including a YouTube plugin for video acquisition and Raspberry Pi devices for content deployment.

## Core Requirements

### 1. Repository Management

**Video Storage & Organization**
- Cloud storage integration (Cloudflare R2 or similar) for video repository
- Support for MP4 format standardization (integration with existing DBTV YouTube plugin)
- Capacity to manage hundreds of video files
- Automatic thumbnail generation from uploaded videos
- Video metadata management including:
  - Title, duration, file size
  - Custom tags (mood, energy level, color palette)
  - Date added, last modified
  - Usage tracking (which playlists contain each video)

**Search & Filtering Capabilities**
- Real-time search as user types
- Multi-criteria filtering:
  - Tags (psychedelic, ambient, high-energy, etc.)
  - Duration ranges (under 2min, 2-5min, over 5min)
  - Date added
  - Usage status (unused, single playlist, multiple playlists)
- Sorting options:
  - Alphabetical (A-Z, Z-A)
  - Date added (newest/oldest first)
  - Duration (shortest/longest first)
  - Usage frequency

### 2. Kanban Interface Design

**Layout Structure**
- Desktop-first responsive design optimizing for horizontal space
- Fixed repository column on the left side
- Horizontally scrollable playlist columns
- Dynamic playlist creation with "Add Playlist" button at right edge

**Repository Column**
- Compact video cards displaying:
  - Small thumbnail (40px height)
  - Video title (truncated)
  - Duration
  - Playlist usage indicator
  - Tag preview
- Collapsible search/filter panel at top
- Visual distinction (blue border/background) from playlist columns

**Playlist Columns**
- Standard-sized video cards displaying:
  - Larger thumbnail (60px height)
  - Full video title
  - Duration and date added
  - Complete tag list
  - Drag handle for reordering
- Column headers showing:
  - Playlist name (editable)
  - Video count
  - Menu options (rename, delete, duplicate)
- Minimum width: 280px per column
- Support for up to 50 playlists with horizontal scrolling

**Card Interactions**
- Drag and drop from repository to playlists (creates copy)
- Drag and drop within playlists for reordering
- Drag and drop between playlists (creates copy)
- Visual feedback during drag operations
- Hover effects for better UX

### 3. Playlist Management

**Dynamic Playlist Creation**
- "Add Playlist" button always visible at right edge during horizontal scroll
- Immediate naming prompt when creating new playlist
- Default playlist templates available
- Playlist duplication functionality

**Playlist Operations**
- Rename playlists inline or via context menu
- Delete playlists with confirmation dialog
- Duplicate entire playlists
- Reorder playlist columns via drag and drop
- Bulk operations for multiple video selection

**Video Management Within Playlists**
- Videos can exist in multiple playlists simultaneously
- Reorder videos within playlists via drag and drop
- Remove videos from specific playlists without affecting repository
- Visual indicators showing which other playlists contain the same video

### 4. Content Package System

**Package Builder Interface**
- Separate view/page from main Kanban board
- Two-panel layout:
  - Left panel: Available content selection
  - Right panel: Package contents and preview

**Content Selection**
- Tabbed interface switching between:
  - Playlist selection (checkbox-based)
  - Individual file selection (checkbox-based)
- Size estimates for selected content
- Search and filter capabilities within selection panels

**Package Assembly**
- Working area showing selected playlists and files
- Remove items from package without affecting source playlists
- Real-time package size calculation based on selected videos (no duplication)
- Live folder structure preview showing export hierarchy:
  ```
  content/
  ├── packages/
  │   ├── selected-video1.mp4
  │   ├── selected-video2.mp4
  │   ├── metadata.json
  │   └── thumbnails/
  │       ├── selected-video1.jpg
  │       └── selected-video2.jpg
  └── playlists/
      ├── selected-playlist1.json
      ├── selected-playlist2.json
      └── default.json
  ```

**Package Management**
- Save packages with custom names for future reuse
- Edit saved packages (add/remove content)
- Package versioning and metadata
- Package library accessible from main interface

**Export Functionality**
- Export packages in DBTV-compatible format:
  ```
  content/
  ├── packages/
  │   ├── *.mp4              # All video files in shared location
  │   ├── metadata.json      # Master metadata file
  │   └── thumbnails/
  │       └── *.jpg
  └── playlists/
      ├── playlist1.json     # Individual playlist definitions
      ├── playlist2.json
      └── default.json       # Required default playlist
  ```
- Downloadable ZIP file generation
- Package deployment tracking

### 5. Technical Architecture

**Frontend Requirements**
- Modern web application (React/Vue.js recommended)
- Desktop-optimized responsive design
- Real-time search and filtering
- Drag and drop functionality
- File upload capabilities
- Progress indicators for long operations

**Backend Requirements**
- RESTful API for video and playlist management
- Cloud storage integration (Cloudflare R2 or AWS S3)
- Video metadata extraction and thumbnail generation
- Search indexing for fast content discovery
- Package generation and export services

**Data Models**

**Video Entity**
```json
{
  "id": "uuid",
  "title": "string",
  "filename": "string", 
  "duration": "number (seconds)",
  "fileSize": "number (bytes)",
  "thumbnailUrl": "string",
  "tags": ["string"],
  "dateAdded": "timestamp",
  "lastModified": "timestamp",
  "sourceUrl": "string (optional YouTube URL)",
  "metadata": {
    "resolution": "string",
    "codec": "string",
    "bitrate": "number"
  }
}
```

**Playlist Entity**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string (optional)",
  "videoIds": ["uuid"],
  "videoOrder": ["uuid"],
  "dateCreated": "timestamp",
  "lastModified": "timestamp",
  "tags": ["string"],
  "metadata": {
    "totalDuration": "number",
    "videoCount": "number",
    "totalSize": "number"
  }
}
```

**Package Entity**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string (optional)",
  "playlistIds": ["uuid"],
  "individualVideoIds": ["uuid"],
  "dateCreated": "timestamp",
  "lastExported": "timestamp",
  "exportCount": "number",
  "metadata": {
    "totalSize": "number",
    "totalVideos": "number",
    "totalPlaylists": "number"
  }
}
```

**Master Metadata Export Format**
```json
{
  "video_library": {
    "last_updated": "ISO 8601 timestamp",
    "total_videos": "integer count",
    "total_duration_seconds": "integer duration",
    "videos": {
      "filename.mp4": {
        "title": "human-readable title",
        "filename": "exact filename",
        "duration_seconds": "integer duration",
        "duration_formatted": "HH:MM:SS format",
        "thumbnail": "relative path to thumbnail",
        "mood": "ambient|high-energy|psychedelic",
        "resolution": "video resolution",
        "category": "background_visuals|performance_visuals|ambient_visuals"
      }
    }
  }
}
```

**Individual Playlist Export Format**
```json
{
  "name": "human-readable playlist name",
  "description": "playlist description",
  "mood": "primary mood category",
  "loop": "boolean - true for continuous loop",
  "videos": [
    {
      "filename": "video filename from packages/",
      "title": "video title from metadata",
      "duration_seconds": "integer duration",
      "duration_formatted": "HH:MM:SS format",
      "thumbnail": "relative thumbnail path"
    }
  ]
}
```

### 6. User Experience Requirements

**Navigation & Layout**
- Primary navigation tabs: Playlists, Packages, Settings
- Breadcrumb navigation for deep workflows
- Keyboard shortcuts for common operations
- Undo/redo functionality for playlist modifications

**Performance Requirements**
- Fast loading times (<3 seconds for main interface)
- Smooth drag and drop operations (60fps)
- Efficient search results (<500ms response time)
- Optimized video thumbnail loading
- Progressive loading for large video libraries

**Accessibility**
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Proper ARIA labels and roles

**Error Handling**
- Graceful handling of network connectivity issues
- Clear error messages for failed operations
- Automatic retry mechanisms for transient failures
- Data validation and user feedback

### 7. Integration Requirements

**YouTube Plugin Integration**
- Import processed MP4 files from existing DBTV YouTube plugin
- Preserve metadata from video download process
- Automatic file format validation and conversion if needed

**DBTV System Compatibility**
- Export packages in format compatible with existing DBTV Raspberry Pi deployment:
  - Shared video pool in `content/packages/` directory
  - Single `metadata.json` file describing all videos
  - Individual playlist JSON files in `content/playlists/` directory
  - Required `default.json` playlist for system startup
  - Thumbnail files in `content/packages/thumbnails/` directory
- Support for existing mood categories: `ambient`, `high-energy`, `psychedelic`
- Support for existing content categories: `background_visuals`, `performance_visuals`, `ambient_visuals`
- Maintain consistency with current JSON schema for playlist definitions
- Generate packages that can directly replace default DBTV content

**Cloud Storage**
- Secure video upload and storage
- CDN integration for fast video delivery
- Backup and redundancy for video content
- Storage usage monitoring and management

### 8. Security & Performance

**Security Requirements**
- User authentication and authorization
- Secure file upload with virus scanning
- HTTPS enforcement for all communications
- Input validation and sanitization
- Rate limiting for API endpoints

**Performance Optimization**
- Video thumbnail caching
- Lazy loading for large video libraries
- Efficient search indexing
- Optimized database queries
- CDN utilization for video delivery

### 9. Future Considerations

**Potential Enhancements**
- Collaborative playlist editing for multiple band members
- Video preview functionality within the interface
- Automated playlist generation based on audio analysis
- Integration with lighting control systems (DMX)
- Mobile companion app for basic playlist control
- Analytics dashboard for content usage tracking

**Scalability Considerations**
- Support for multiple bands/organizations
- Video sharing between different DBTV installations
- Advanced search capabilities (visual similarity, color analysis)
- Machine learning-based content recommendations
- Support for multiple bands/organizations
- Video sharing between different DBTV installations
- Advanced search capabilities (visual similarity, color analysis)
- Machine learning-based content recommendations

## Success Criteria

1. **Functional Requirements Met**: All core features operational and tested
2. **Performance Targets**: Interface loads <3 seconds, search results <500ms
3. **User Experience**: Intuitive drag-and-drop workflow, minimal learning curve
4. **Integration Success**: Seamless compatibility with existing DBTV system
5. **Reliability**: 99.9% uptime, robust error handling and recovery

## Acceptance Criteria

- [ ] User can upload and organize hundreds of MP4 video files
- [ ] Kanban interface supports creation and management of up to 50 playlists
- [ ] Real-time search and filtering across all video content
- [ ] Drag and drop functionality works smoothly across all supported browsers
- [ ] Package builder creates valid DBTV-compatible export files
- [ ] Saved packages can be edited and re-exported
- [ ] System integrates with existing YouTube plugin workflow
- [ ] All core functionality works offline after initial load
- [ ] Interface is responsive and optimized for desktop use
- [ ] Export packages deploy successfully to DBTV Raspberry Pi devices

---

## Wireframes Reference

*[The wireframes created earlier should be referenced here as visual specifications for the development team]*

This requirements document provides the foundation for building the DBTV Playlist Manager system. It should be used in conjunction with the provided wireframes to guide development and ensure all stakeholder needs are met.