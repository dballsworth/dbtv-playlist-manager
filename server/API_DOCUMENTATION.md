# DBTV Playlist Manager API Documentation

## Overview
The DBTV Playlist Manager API provides endpoints for querying and downloading playlist packages stored in Cloudflare R2. This API can be consumed by dbtv-remote and dbtv-system to access package content.

## Base URL
```
http://localhost:3001/api
```

## Authentication
Currently, no authentication is required. Add authentication headers if needed in production.

## Endpoints

### 1. Health Check
Check if the API server is running.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. List All Packages
Get a list of all available packages.

**Endpoint:** `GET /api/packages`

**Query Parameters:**
- `includeMetadata` (optional): Set to `true` to include playlist and video counts (slower response)

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "id": "playlists/package-2024-01-15T10-30-00-dbtv-package.zip",
      "filename": "package-2024-01-15T10-30-00-dbtv-package.zip",
      "packageName": "Package Name",
      "size": 1048576,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "playlistCount": 5,
      "playlistNames": ["Playlist 1", "Playlist 2", "..."],
      "videoCount": 25,
      "downloadUrl": "/api/packages/playlists%2Fpackage-2024-01-15T10-30-00-dbtv-package.zip/download"
    }
  ],
  "total": 10
}
```

### 3. Get Package Details
Get detailed information about a specific package.

**Endpoint:** `GET /api/packages/:id`

**Parameters:**
- `id`: The package ID (R2 key)

**Response:**
```json
{
  "success": true,
  "package": {
    "id": "playlists/package-2024-01-15T10-30-00-dbtv-package.zip",
    "filename": "package-2024-01-15T10-30-00-dbtv-package.zip",
    "packageName": "Package Name",
    "size": 1048576,
    "lastModified": "2024-01-15T10:30:00.000Z",
    "playlistCount": 5,
    "playlistNames": ["Playlist 1", "Playlist 2", "..."],
    "videoCount": 25,
    "downloadUrl": "/api/packages/playlists%2Fpackage-2024-01-15T10-30-00-dbtv-package.zip/download"
  }
}
```

### 4. Download Package
Download a package ZIP file.

**Endpoint:** `GET /api/packages/:id/download`

**Parameters:**
- `id`: The package ID (R2 key)

**Response:**
- Binary ZIP file with appropriate headers
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="package.zip"`

### 5. Search Packages
Search and filter packages.

**Endpoint:** `GET /api/packages/search`

**Query Parameters:**
- `query` (optional): Search term to match against package names and playlist names
- `minPlaylists` (optional): Minimum number of playlists
- `maxPlaylists` (optional): Maximum number of playlists
- `minVideos` (optional): Minimum number of videos
- `maxVideos` (optional): Maximum number of videos

**Response:**
```json
{
  "success": true,
  "packages": [...],
  "total": 5
}
```

## Error Responses

### 404 Not Found
```json
{
  "success": false,
  "error": "Package not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to perform operation",
  "message": "Detailed error message"
}
```

## Usage Examples

### Using curl

List all packages:
```bash
curl http://localhost:3001/api/packages
```

Get package details:
```bash
curl http://localhost:3001/api/packages/playlists%2Fpackage-2024-01-15T10-30-00-dbtv-package.zip
```

Download a package:
```bash
curl -O http://localhost:3001/api/packages/playlists%2Fpackage-2024-01-15T10-30-00-dbtv-package.zip/download
```

Search packages:
```bash
curl "http://localhost:3001/api/packages/search?query=training&minVideos=10"
```

### Using JavaScript/fetch

```javascript
// List packages
const response = await fetch('http://localhost:3001/api/packages');
const data = await response.json();
console.log(data.packages);

// Download package
const downloadResponse = await fetch('http://localhost:3001/api/packages/PACKAGE_ID/download');
const blob = await downloadResponse.blob();
// Save blob as file
```

### Using Python

```python
import requests

# List packages
response = requests.get('http://localhost:3001/api/packages')
packages = response.json()['packages']

# Download package
download_response = requests.get(f'http://localhost:3001/api/packages/{package_id}/download')
with open('package.zip', 'wb') as f:
    f.write(download_response.content)
```

## Setup Instructions

1. Copy `.env.example` to `.env` and configure your R2 credentials
2. Install dependencies: `npm install`
3. Start the server: `npm start` (or `npm run dev` for development with auto-reload)

## CORS Configuration

The API supports CORS for cross-origin requests. Configure allowed origins in the `.env` file:
```
CORS_ORIGIN=http://localhost:5173,https://dbtv-remote.example.com
```

## Security Considerations

For production use:
1. Add authentication (API keys, JWT tokens, etc.)
2. Implement rate limiting
3. Use HTTPS
4. Restrict CORS origins
5. Add request validation and sanitization
6. Implement logging and monitoring