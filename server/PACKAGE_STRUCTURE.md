# DBTV Package Structure Documentation

This document provides comprehensive documentation of the DBTV playlist package format, including ZIP structure, file formats, and metadata specifications.

## Table of Contents
- [Overview](#overview)
- [ZIP File Structure](#zip-file-structure)
- [Playlist Files](#playlist-files)
- [Video Files](#video-files)
- [Metadata Files](#metadata-files)
- [Naming Conventions](#naming-conventions)
- [File Format Specifications](#file-format-specifications)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Validation](#validation)

## Overview

DBTV packages are ZIP files containing organized training content with playlists, videos, and metadata. Each package represents a complete training module or content collection that can be distributed and consumed by DBTV remote systems.

### Package Characteristics
- **Format**: ZIP archives with specific internal structure
- **Content**: Video files organized by playlists with JSON metadata
- **Portability**: Self-contained packages with all required assets
- **Metadata**: Both embedded and external metadata for fast discovery
- **Versioning**: Timestamp-based versioning in filenames

## ZIP File Structure

### Standard Package Structure
```
package-name-2024-01-15T10-30-00-dbtv-package.zip
├── content/
│   ├── playlists/
│   │   ├── playlist-1.json
│   │   ├── playlist-2.json
│   │   └── playlist-n.json
│   └── videos/
│       ├── video-1.mp4
│       ├── video-2.mp4
│       ├── video-n.mp4
│       └── subtitles/ (optional)
│           ├── video-1.srt
│           └── video-2.srt
├── thumbnails/ (optional)
│   ├── video-1.jpg
│   ├── video-2.jpg
│   └── playlist-covers/
│       ├── playlist-1.jpg
│       └── playlist-2.jpg
├── assets/ (optional)
│   ├── images/
│   ├── documents/
│   └── resources/
└── package-name.meta.json (optional)
```

### Required Directories
- **content/playlists/**: Contains JSON playlist definition files
- **content/videos/**: Contains video files referenced by playlists

### Optional Directories
- **thumbnails/**: Video thumbnails and playlist cover images
- **assets/**: Additional resources (PDFs, images, documents)
- **content/videos/subtitles/**: Subtitle files for videos

## Playlist Files

### Playlist JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "videos"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Human-readable playlist name"
    },
    "description": {
      "type": "string",
      "description": "Playlist description"
    },
    "version": {
      "type": "string",
      "description": "Playlist version (semver format)"
    },
    "created": {
      "type": "string",
      "format": "date-time",
      "description": "Creation timestamp"
    },
    "modified": {
      "type": "string",
      "format": "date-time",
      "description": "Last modification timestamp"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Categorization tags"
    },
    "difficulty": {
      "type": "string",
      "enum": ["beginner", "intermediate", "advanced"],
      "description": "Content difficulty level"
    },
    "duration": {
      "type": "integer",
      "description": "Total playlist duration in seconds"
    },
    "cover": {
      "type": "string",
      "description": "Relative path to cover image"
    },
    "videos": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/video"
      },
      "description": "Array of video objects"
    }
  },
  "definitions": {
    "video": {
      "type": "object",
      "required": ["filename", "title"],
      "properties": {
        "filename": {
          "type": "string",
          "description": "Video filename within the package"
        },
        "title": {
          "type": "string",
          "description": "Video title"
        },
        "description": {
          "type": "string",
          "description": "Video description"
        },
        "duration": {
          "type": "integer",
          "description": "Video duration in seconds"
        },
        "thumbnail": {
          "type": "string",
          "description": "Relative path to thumbnail image"
        },
        "subtitles": {
          "type": "string",
          "description": "Relative path to subtitle file"
        },
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Video-specific tags"
        },
        "order": {
          "type": "integer",
          "description": "Display order within playlist"
        },
        "checksum": {
          "type": "string",
          "description": "MD5 or SHA256 checksum of video file"
        }
      }
    }
  }
}
```

### Example Playlist File
```json
{
  "name": "Safety Fundamentals",
  "description": "Essential safety procedures and protocols for all employees",
  "version": "1.2.0",
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-15T14:22:30Z",
  "tags": ["safety", "fundamentals", "mandatory"],
  "difficulty": "beginner",
  "duration": 1800,
  "cover": "thumbnails/playlist-covers/safety-fundamentals.jpg",
  "videos": [
    {
      "filename": "intro-to-safety.mp4",
      "title": "Introduction to Workplace Safety",
      "description": "Overview of basic safety principles and why they matter",
      "duration": 300,
      "thumbnail": "thumbnails/intro-to-safety.jpg",
      "subtitles": "content/videos/subtitles/intro-to-safety.srt",
      "tags": ["introduction", "overview"],
      "order": 1,
      "checksum": "d41d8cd98f00b204e9800998ecf8427e"
    },
    {
      "filename": "ppe-overview.mp4",
      "title": "Personal Protective Equipment",
      "description": "Proper use and maintenance of PPE",
      "duration": 420,
      "thumbnail": "thumbnails/ppe-overview.jpg",
      "subtitles": "content/videos/subtitles/ppe-overview.srt",
      "tags": ["ppe", "equipment", "protection"],
      "order": 2,
      "checksum": "098f6bcd4621d373cade4e832627b4f6"
    },
    {
      "filename": "emergency-procedures.mp4",
      "title": "Emergency Response Procedures",
      "description": "What to do in case of workplace emergencies",
      "duration": 600,
      "thumbnail": "thumbnails/emergency-procedures.jpg",
      "subtitles": "content/videos/subtitles/emergency-procedures.srt",
      "tags": ["emergency", "procedures", "response"],
      "order": 3,
      "checksum": "5d41402abc4b2a76b9719d911017c592"
    }
  ]
}
```

## Video Files

### Supported Video Formats
- **Primary**: MP4 (H.264/H.265 codec)
- **Secondary**: WebM, AVI, MOV
- **Audio**: AAC, MP3 (embedded)

### Video File Requirements
- **Resolution**: Minimum 720p, recommended 1080p
- **Frame Rate**: 24-60 fps
- **Bitrate**: Adaptive based on content complexity
- **Duration**: No strict limits, but consider bandwidth

### Video File Naming
- Use descriptive, URL-safe filenames
- Include sequence numbers for ordered content
- Avoid spaces and special characters
- Examples:
  - `01-introduction.mp4`
  - `safety-overview.mp4`
  - `module-3-advanced-techniques.mp4`

### Video Metadata (Embedded)
Videos should include embedded metadata when possible:
- Title
- Description
- Creation date
- Duration
- Keywords/tags

## Metadata Files

### Package Metadata File (.meta.json)

The package metadata file provides fast access to package information without extracting the entire ZIP.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["packageName", "created", "playlistCount", "videoCount"],
  "properties": {
    "packageName": {
      "type": "string",
      "description": "Human-readable package name"
    },
    "description": {
      "type": "string",
      "description": "Package description"
    },
    "version": {
      "type": "string",
      "description": "Package version (semver format)"
    },
    "created": {
      "type": "string",
      "format": "date-time",
      "description": "Package creation timestamp"
    },
    "modified": {
      "type": "string",
      "format": "date-time",
      "description": "Last modification timestamp"
    },
    "author": {
      "type": "string",
      "description": "Package creator/organization"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Package-level tags"
    },
    "category": {
      "type": "string",
      "description": "Content category"
    },
    "playlistCount": {
      "type": "integer",
      "description": "Number of playlists in package"
    },
    "playlistNames": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Names of all playlists"
    },
    "videoCount": {
      "type": "integer",
      "description": "Total number of unique videos"
    },
    "totalDuration": {
      "type": "integer",
      "description": "Total duration of all videos in seconds"
    },
    "totalSize": {
      "type": "integer",
      "description": "Total package size in bytes"
    },
    "requirements": {
      "type": "object",
      "properties": {
        "minPlayerVersion": { "type": "string" },
        "supportedPlatforms": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

### Example Package Metadata
```json
{
  "packageName": "Safety Training Fundamentals",
  "description": "Comprehensive safety training for all new employees",
  "version": "2.1.0",
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-15T16:45:00Z",
  "author": "DBTV Training Department",
  "tags": ["safety", "training", "mandatory", "fundamentals"],
  "category": "safety",
  "playlistCount": 3,
  "playlistNames": [
    "Safety Fundamentals",
    "Equipment Operation",
    "Emergency Procedures"
  ],
  "videoCount": 12,
  "totalDuration": 3600,
  "totalSize": 524288000,
  "requirements": {
    "minPlayerVersion": "1.0.0",
    "supportedPlatforms": ["web", "mobile", "desktop"]
  }
}
```

## Naming Conventions

### Package Filename Format
```
{package-name}-{timestamp}-dbtv-package.zip
```

**Components:**
- `{package-name}`: Lowercase, hyphen-separated package identifier
- `{timestamp}`: ISO 8601 format: `YYYY-MM-DDTHH-MM-SS`
- `dbtv-package`: Fixed suffix identifying DBTV packages
- `.zip`: File extension

**Examples:**
- `safety-training-2024-01-15T10-30-00-dbtv-package.zip`
- `equipment-basics-2024-02-20T14-15-30-dbtv-package.zip`
- `advanced-procedures-2024-03-10T09-45-15-dbtv-package.zip`

### Internal File Naming
- **Playlists**: `{playlist-name}.json`
- **Videos**: `{descriptive-name}.{extension}`
- **Thumbnails**: `{video-name}.{jpg|png}`
- **Subtitles**: `{video-name}.srt`

### Character Restrictions
- Use only alphanumeric characters, hyphens, and underscores
- No spaces in filenames
- Avoid special characters: `& < > " ' | ? * : / \`
- Maximum filename length: 255 characters

## File Format Specifications

### Video Formats

#### MP4 (Recommended)
```
Container: MP4
Video Codec: H.264 (AVC) or H.265 (HEVC)
Audio Codec: AAC
Resolution: 720p, 1080p, or 4K
Frame Rate: 24-60 fps
Bitrate: Variable (VBR) recommended
```

#### WebM (Alternative)
```
Container: WebM
Video Codec: VP8 or VP9
Audio Codec: Vorbis or Opus
Resolution: 720p, 1080p
Frame Rate: 24-60 fps
```

### Image Formats
- **Thumbnails**: JPEG (quality 80-90%)
- **Cover Images**: JPEG or PNG
- **Icons**: PNG with transparency

### Subtitle Formats
- **Primary**: SRT (SubRip)
- **Secondary**: VTT (WebVTT)
- **Encoding**: UTF-8

### Document Formats
- **Text**: PDF, Markdown
- **Presentations**: PDF (exported from PowerPoint/Keynote)
- **Resources**: PDF, HTML

## Best Practices

### Package Creation
1. **Validate Content**: Ensure all referenced files exist
2. **Optimize Videos**: Use appropriate compression settings
3. **Include Metadata**: Always provide complete metadata
4. **Test Playback**: Verify all videos play correctly
5. **Check File Paths**: Use relative paths consistently

### File Organization
1. **Logical Structure**: Group related content together
2. **Consistent Naming**: Follow naming conventions strictly
3. **Size Management**: Keep packages under 500MB when possible
4. **Quality Control**: Review all content before packaging

### Performance Optimization
1. **Video Compression**: Balance quality and file size
2. **Thumbnail Quality**: Use appropriate resolution (320x180 or 640x360)
3. **Metadata Caching**: Include .meta.json for faster discovery
4. **Progressive Download**: Consider video streaming requirements

### Accessibility
1. **Subtitles**: Include subtitles for all videos
2. **Descriptions**: Provide detailed descriptions
3. **Thumbnails**: Use meaningful thumbnail images
4. **Alt Text**: Include alternative text for images

## Examples

### Minimal Package Example
```
basic-training-2024-01-15T10-30-00-dbtv-package.zip
├── content/
│   ├── playlists/
│   │   └── introduction.json
│   └── videos/
│       └── welcome-video.mp4
└── basic-training.meta.json
```

### Comprehensive Package Example
```
advanced-safety-2024-01-15T10-30-00-dbtv-package.zip
├── content/
│   ├── playlists/
│   │   ├── hazard-identification.json
│   │   ├── risk-assessment.json
│   │   └── incident-response.json
│   └── videos/
│       ├── hazard-types.mp4
│       ├── risk-matrix.mp4
│       ├── incident-reporting.mp4
│       └── subtitles/
│           ├── hazard-types.srt
│           ├── risk-matrix.srt
│           └── incident-reporting.srt
├── thumbnails/
│   ├── hazard-types.jpg
│   ├── risk-matrix.jpg
│   ├── incident-reporting.jpg
│   └── playlist-covers/
│       ├── hazard-identification.jpg
│       ├── risk-assessment.jpg
│       └── incident-response.jpg
├── assets/
│   ├── documents/
│   │   ├── safety-handbook.pdf
│   │   └── emergency-contacts.pdf
│   └── images/
│       ├── hazard-symbols.png
│       └── safety-equipment.jpg
└── advanced-safety.meta.json
```

## Validation

### Package Validation Checklist
- [ ] Package filename follows naming convention
- [ ] Contains required directories (content/playlists/, content/videos/)
- [ ] All playlist JSON files are valid
- [ ] All referenced video files exist
- [ ] Video files are in supported formats
- [ ] Playlist names are unique within package
- [ ] Video filenames are unique within package
- [ ] All file paths use forward slashes
- [ ] No absolute file paths in JSON
- [ ] Package metadata file is valid JSON
- [ ] Total package size is reasonable

### JSON Schema Validation
Use the provided JSON schemas to validate playlist and metadata files:

```bash
# Install ajv-cli for validation
npm install -g ajv-cli

# Validate playlist file
ajv validate -s playlist-schema.json -d playlist.json

# Validate metadata file
ajv validate -s metadata-schema.json -d package.meta.json
```

### Automated Validation Script
```javascript
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function validateDBTVPackage(packagePath) {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Read and parse ZIP
    const zipData = fs.readFileSync(packagePath);
    const zip = new JSZip();
    await zip.loadAsync(zipData);

    // Check required directories
    const hasPlaylists = Object.keys(zip.files).some(f => f.startsWith('content/playlists/'));
    const hasVideos = Object.keys(zip.files).some(f => f.startsWith('content/videos/'));

    if (!hasPlaylists) {
      validation.errors.push('Missing content/playlists/ directory');
      validation.valid = false;
    }

    if (!hasVideos) {
      validation.errors.push('Missing content/videos/ directory');
      validation.valid = false;
    }

    // Validate playlist files
    const playlistFiles = Object.keys(zip.files).filter(f => 
      f.startsWith('content/playlists/') && f.endsWith('.json')
    );

    for (const playlistFile of playlistFiles) {
      try {
        const content = await zip.file(playlistFile).async('text');
        const playlist = JSON.parse(content);
        
        // Basic validation
        if (!playlist.name) {
          validation.errors.push(`Playlist ${playlistFile} missing name`);
          validation.valid = false;
        }
        
        if (!playlist.videos || !Array.isArray(playlist.videos)) {
          validation.errors.push(`Playlist ${playlistFile} missing videos array`);
          validation.valid = false;
        }
        
        // Check video file references
        for (const video of playlist.videos || []) {
          const videoPath = `content/videos/${video.filename}`;
          if (!zip.files[videoPath]) {
            validation.errors.push(`Video file not found: ${videoPath}`);
            validation.valid = false;
          }
        }
        
      } catch (error) {
        validation.errors.push(`Invalid JSON in ${playlistFile}: ${error.message}`);
        validation.valid = false;
      }
    }

    return validation;

  } catch (error) {
    validation.errors.push(`Failed to read package: ${error.message}`);
    validation.valid = false;
    return validation;
  }
}

// Usage
validateDBTVPackage('path/to/package.zip').then(result => {
  if (result.valid) {
    console.log('Package is valid!');
  } else {
    console.log('Validation errors:', result.errors);
  }
});
```

## Version History

- **v1.0.0**: Initial package format specification
- **v1.1.0**: Added support for thumbnails and subtitles
- **v1.2.0**: Enhanced metadata schema with requirements field
- **v2.0.0**: Restructured directories, added assets folder

## Related Documentation

- **API Documentation**: `API_DOCUMENTATION.md`
- **Integration Guide**: `DBTV_REMOTE_INTEGRATION.md`
- **OpenAPI Specification**: `openapi.yaml`
- **Client SDK**: `examples/dbtv-client.js`