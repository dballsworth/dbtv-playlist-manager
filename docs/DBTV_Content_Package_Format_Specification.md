# DBTV Content Package Format - Business Requirements Specification

## Document Information
- **Document Type**: Business Requirements Specification
- **System**: DBTV Video Management System
- **Component**: Content Package Format
- **Version**: 1.0
- **Date**: 2025-08-05
- **Status**: Draft

## Executive Summary

This document defines the business requirements for the DBTV Content Package Format, a standardized structure for organizing and managing video content within the DBTV Video Management System. The format enables efficient content distribution, metadata management, and playlist organization for live musical performances.

## Business Context

The DBTV system provides synchronized visual content across multiple displays during live performances by Dickens & Ballsworth. Content packages must be optimized for:
- Raspberry Pi hardware constraints (32GB SD cards)
- Network-isolated venue environments
- Real-time performance requirements
- Drummer-friendly mobile control interface

**Note**: The current content in `dbtv-system/content/packages/` and `dbtv-system/content/playlists/` represents **default content** that ships with the system. This default content can be completely overwritten by publishing new content packages with custom video assets and playlists.

## Content Package Format Requirements

### 1. Package Structure

#### 1.1 Root Content Directory
**Requirement**: The content package SHALL be organized within a `content/` root directory.

**Structure**:
```
content/
├── packages/           # Video assets and metadata
├── playlists/         # Playlist definitions
└── examples/          # Sample content for testing
```

#### 1.2 Package Assets Directory
**Requirement**: All video assets and metadata SHALL be contained within `content/packages/`.

**Structure**:
```
packages/
├── *.mp4             # Video files
├── metadata.json     # Master metadata file
└── thumbnails/       # Video preview images
    └── *.jpg         # Thumbnail files
```

### 2. Video Asset Requirements

#### 2.1 Video File Format
- **Format**: MP4 container
- **Resolution**: 1920x1080 (Full HD)
- **Naming Convention**: `{mood}_{sequence}.mp4`
  - Examples: `ambient_01.mp4`, `energy_03.mp4`, `psychedelic_02.mp4`

#### 2.2 Supported Moods
- `ambient`: Calm, background visuals for startup and breaks
- `high-energy`: Fast-paced visuals for energetic performances  
- `psychedelic`: Mind-bending visuals for intense performances

#### 2.3 Content Categories
- `background_visuals`: Suitable for ambient/break periods
- `performance_visuals`: Designed for live performance sync
- `ambient_visuals`: Atmospheric content for mood setting

### 3. Thumbnail Requirements

#### 3.1 Thumbnail Format
- **Format**: JPEG
- **Location**: `packages/thumbnails/`
- **Naming**: Must match corresponding video filename with `.jpg` extension
- **Purpose**: Mobile interface preview images

#### 3.2 Thumbnail Specifications
- **Resolution**: Optimized for mobile display
- **Quality**: Sufficient for playlist selection interface
- **File Size**: Minimized for Pi storage constraints

### 4. Metadata Requirements

#### 4.1 Master Metadata File
**File**: `packages/metadata.json`

**Required Structure**:
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
        "mood": "mood category",
        "resolution": "video resolution",
        "category": "content category"
      }
    }
  }
}
```

#### 4.2 Metadata Validation Rules
- All video files in packages/ MUST have corresponding metadata entries
- Thumbnail paths MUST reference existing files
- Duration information MUST be accurate for playlist timing
- Mood and category values MUST match approved enumerations

### 5. Playlist Requirements

#### 5.1 Playlist File Format
**Location**: `content/playlists/`
**Format**: JSON
**Naming**: `{playlist-name}.json`

#### 5.2 Playlist Structure
```json
{
  "name": "human-readable playlist name",
  "description": "playlist description",
  "mood": "primary mood category",
  "loop": "boolean - true for continuous loop",
  "videos": [
    {
      "filename": "video filename from packages/",
      "title": "video title",
      "duration_seconds": "integer duration",
      "duration_formatted": "HH:MM:SS format",
      "thumbnail": "relative thumbnail path"
    }
  ]
}
```

#### 5.3 Playlist Requirements
**Mandatory Playlist**:
- One playlist MUST be designated as the default playlist for system startup
- Default playlist name and content can be customized per content package

**Additional Playlists**:
- Content packages MAY include 1 to many additional playlists
- No limit on number of playlists beyond storage constraints
- Each playlist MUST follow the defined JSON structure

**Shipped Default Playlists** (can be overwritten):
- `default.json`: Safe ambient content for system startup
- `high-energy.json`: Performance-oriented high-energy content
- `psychedelic.json`: Intense visual content for specific performances

### 6. Storage and Distribution Requirements

#### 6.1 Storage Constraints
- **Target Size**: Content packages optimized for 32GB Pi storage
- **Reserve Space**: Allow minimum 8GB for system and temporary files
- **Maximum Package**: 24GB total content per Pi

#### 6.2 Distribution Method
- **Primary**: Direct SD card imaging with pre-loaded content
- **Secondary**: Network distribution for content updates (future enhancement)

### 7. Quality Assurance Requirements

#### 7.1 Content Validation
- All videos MUST play successfully in VLC media player
- Thumbnails MUST display correctly in mobile interface
- Metadata integrity MUST be validated before deployment

#### 7.2 Playlist Validation  
- All referenced videos MUST exist in packages directory
- Playlist total duration MUST support continuous loop requirements
- Thumbnail references MUST be valid

### 8. Performance Requirements

#### 8.1 Load Time
- Metadata parsing MUST complete within 5 seconds on Pi hardware
- Playlist switching MUST occur within 3 seconds
- Initial content load MUST support 2-minute startup requirement

#### 8.2 Reliability
- Content package format MUST support 99.9% uptime requirement
- Graceful degradation for missing or corrupted content files
- Fallback to default playlist for error conditions

## Implementation Considerations

### Phase 0 MVP Scope
- Basic content package structure (COMPLETED)
- Metadata format definition (COMPLETED)  
- Default content package with example playlists (COMPLETED)
- VLC playback integration (IN PROGRESS)

### Future Enhancements
- Content package deployment and update system
- Content encryption for proprietary visuals
- Dynamic playlist generation based on performance metrics
- Compressed content packages for faster distribution
- Version management for content updates
- Custom content package creation tools

## Acceptance Criteria

1. **Package Structure**: Content follows defined directory structure
2. **Video Format**: All videos play in VLC with specified resolution
3. **Metadata Integrity**: JSON validates against schema with 100% accuracy
4. **Playlist Function**: All playlists load and cycle correctly
5. **Thumbnail Display**: All thumbnails render in mobile interface
6. **Performance**: Meets load time and reliability requirements
7. **Storage**: Package fits within Pi storage constraints

## Risks and Mitigation

### Content Corruption Risk
- **Risk**: Video file corruption affecting performance
- **Mitigation**: Checksum validation and backup content packages

### Storage Overflow Risk
- **Risk**: Content exceeding Pi storage capacity
- **Mitigation**: Automated size validation and content optimization

### Format Compatibility Risk
- **Risk**: Video format incompatibility with VLC/Pi hardware
- **Mitigation**: Standardized encoding parameters and pre-deployment testing

## Conclusion

The DBTV Content Package Format provides a robust foundation for content management within the video performance system. This specification ensures reliable content delivery while maintaining flexibility for future enhancements and diverse performance requirements.