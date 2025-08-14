# DBTV Playlist Manager

A desktop web application for managing video content for the Dickens & Ballsworth "DBTV" performance system. The application provides a visual, Kanban-style interface for organizing videos into playlists and creating deployable content packages for Raspberry Pi devices used in live performances.

## Features

### 🎬 Video Repository Management
- Cloud storage integration for video uploads
- Support for MP4 format with automatic metadata extraction
- Thumbnail generation and management
- Advanced search and filtering capabilities
- Tag-based organization system

### 📋 Kanban-Style Playlist Management
- Drag-and-drop interface for organizing content
- Multiple playlist creation and management
- Real-time video search and filtering
- Visual feedback during drag operations
- Repository column with compact video cards

### 📦 Content Package Builder
- Two-panel interface for package creation
- Playlist and individual file selection
- Real-time package size calculation
- Live folder structure preview
- Export functionality for DBTV-compatible packages
- **Delete packages** with confirmation
- **Fast package listing** with optimized metadata system (100-1000x faster)
- Display package attributes (playlist count, video count, playlist names)

### 🚀 API Server for External Access
- RESTful API for querying and downloading packages
- Designed for consumption by dbtv-remote and dbtv-system
- Search and filter packages by various criteria
- CORS support for cross-origin requests
- Comprehensive API documentation

### 🎛️ DBTV System Integration
- Compatible with existing DBTV Raspberry Pi deployment
- Exports in standardized content package format
- Supports mood categories: ambient, high-energy, psychedelic  
- Maintains consistency with DBTV JSON schema

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Drag & Drop**: @dnd-kit/core
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Styling**: CSS3 with custom properties

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/           # React components
│   ├── kanban/          # Kanban board components
│   ├── package-builder/ # Package builder components
│   └── ui/              # Reusable UI components
├── hooks/               # Custom React hooks
├── stores/              # State management
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── App.tsx              # Main application component
```

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Mock Data
The application currently uses mock data for development. The `useMockData` hook provides sample videos and playlists for testing the interface.

## Integration with DBTV System

The application exports content packages that are directly compatible with the existing DBTV system:

```
content/
├── packages/           # Video assets and metadata
│   ├── *.mp4          # Video files  
│   ├── metadata.json  # Master metadata
│   └── thumbnails/    # Preview images
└── playlists/         # Playlist definitions
    ├── playlist1.json
    ├── playlist2.json  
    └── default.json   # Required default playlist
```

## Documentation

See the `docs/` directory for detailed specifications:
- `dbtv_requirements_doc.md` - Complete business requirements
- `DBTV_Content_Package_Format_Specification.md` - Package format specification  
- `dbtv_wireframes.html` - Visual wireframes and design specifications
