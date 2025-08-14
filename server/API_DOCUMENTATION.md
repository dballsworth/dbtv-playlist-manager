# DBTV Playlist Manager API Documentation

## Overview
The DBTV Playlist Manager API provides REST endpoints for querying and downloading DBTV playlist packages stored in Cloudflare R2. This API is designed to be consumed by dbtv-remote and dbtv-system applications for seamless content management.

### Features
- **Package Discovery**: List and search available content packages
- **Metadata Access**: Get detailed package information including playlist and video counts
- **Content Download**: Download complete packages as ZIP files
- **Advanced Filtering**: Search packages by name, playlist count, video count
- **CORS Support**: Cross-origin requests for web applications

### API Specification
- **Format**: REST API with JSON responses
- **OpenAPI Spec**: See `openapi.yaml` for machine-readable specification
- **Content Type**: `application/json` for data, `application/zip` for downloads

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3001/api
```

## Authentication
**Current**: No authentication required (development mode)

**Production**: Implement one of the following:
- API Key: `Authorization: Bearer your-api-key`
- JWT Token: `Authorization: Bearer jwt-token`

## Data Models

### Package Object
```typescript
interface Package {
  id: string;                    // Unique identifier (R2 key)
  filename: string;              // Original ZIP filename
  packageName: string;           // Human-readable name
  size: number;                  // Size in bytes
  lastModified: string;          // ISO 8601 timestamp
  downloadUrl: string;           // Relative download URL
  playlistCount?: number;        // Number of playlists (optional)
  playlistNames?: string[];      // Playlist names (optional)
  videoCount?: number;           // Total unique videos (optional)
}
```

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;              // Operation success status
  data?: T;                      // Response data (varies by endpoint)
  error?: string;                // Error message (if success = false)
  message?: string;              // Detailed error info (optional)
}
```

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
      "id": "playlists/training-basics-2024-01-15T10-30-00-dbtv-package.zip",
      "filename": "training-basics-2024-01-15T10-30-00-dbtv-package.zip",
      "packageName": "Training Basics",
      "size": 52428800,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "playlistCount": 3,
      "playlistNames": [
        "Safety Fundamentals", 
        "Equipment Operation", 
        "Emergency Procedures"
      ],
      "videoCount": 12,
      "downloadUrl": "/api/packages/playlists%2Ftraining-basics-2024-01-15T10-30-00-dbtv-package.zip/download"
    },
    {
      "id": "playlists/advanced-procedures-2024-01-14T14-22-15-dbtv-package.zip",
      "filename": "advanced-procedures-2024-01-14T14-22-15-dbtv-package.zip",
      "packageName": "Advanced Procedures",
      "size": 104857600,
      "lastModified": "2024-01-14T14:22:15.000Z",
      "playlistCount": 5,
      "playlistNames": [
        "Complex Operations",
        "Troubleshooting Guide",
        "Quality Control",
        "Advanced Safety",
        "Leadership Training"
      ],
      "videoCount": 28,
      "downloadUrl": "/api/packages/playlists%2Fadvanced-procedures-2024-01-14T14-22-15-dbtv-package.zip/download"
    }
  ],
  "total": 2
}
```

**Response Schema:**
- `success` (boolean): Always `true` for successful requests
- `packages` (array): Array of Package objects (see Data Models)
- `total` (number): Total count of packages returned

**Performance Notes:**
- Without `includeMetadata=true`: Fast response (~100ms), no playlist/video counts
- With `includeMetadata=true`: Slower response (~500-2000ms), includes all metadata
- Packages sorted by `lastModified` in descending order (newest first)

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
    "id": "playlists/training-basics-2024-01-15T10-30-00-dbtv-package.zip",
    "filename": "training-basics-2024-01-15T10-30-00-dbtv-package.zip",
    "packageName": "Training Basics",
    "size": 52428800,
    "lastModified": "2024-01-15T10:30:00.000Z",
    "playlistCount": 3,
    "playlistNames": [
      "Safety Fundamentals",
      "Equipment Operation", 
      "Emergency Procedures"
    ],
    "videoCount": 12,
    "downloadUrl": "/api/packages/playlists%2Ftraining-basics-2024-01-15T10-30-00-dbtv-package.zip/download"
  }
}
```

**URL Encoding Note:**
Package IDs must be URL encoded when used in paths:
- Original: `playlists/training-basics-2024-01-15T10-30-00-dbtv-package.zip`
- Encoded: `playlists%2Ftraining-basics-2024-01-15T10-30-00-dbtv-package.zip`

### 4. Download Package
Download a package ZIP file.

**Endpoint:** `GET /api/packages/:id/download`

**Parameters:**
- `id`: The package ID (R2 key)

**Response:**
- **Content-Type**: `application/zip`
- **Content-Disposition**: `attachment; filename="training-basics-2024-01-15T10-30-00-dbtv-package.zip"`
- **Content-Length**: File size in bytes
- **Body**: Binary ZIP file data

**Example Response Headers:**
```
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="training-basics-2024-01-15T10-30-00-dbtv-package.zip"
Content-Length: 52428800
```

**Package ZIP Structure:**
```
package.zip/
├── content/
│   ├── playlists/
│   │   ├── safety-fundamentals.json
│   │   ├── equipment-operation.json
│   │   └── emergency-procedures.json
│   └── videos/
│       ├── intro-to-safety.mp4
│       ├── ppe-overview.mp4
│       ├── equipment-basics.mp4
│       └── emergency-response.mp4
└── training-basics.meta.json (optional metadata)
```

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
  "packages": [
    {
      "id": "playlists/training-basics-2024-01-15T10-30-00-dbtv-package.zip",
      "filename": "training-basics-2024-01-15T10-30-00-dbtv-package.zip",
      "packageName": "Training Basics",
      "size": 52428800,
      "lastModified": "2024-01-15T10:30:00.000Z",
      "playlistCount": 3,
      "playlistNames": ["Safety Fundamentals", "Equipment Operation", "Emergency Procedures"],
      "videoCount": 12,
      "downloadUrl": "/api/packages/playlists%2Ftraining-basics-2024-01-15T10-30-00-dbtv-package.zip/download"
    }
  ],
  "total": 1
}
```

**Search Examples:**
```bash
# Search by name
GET /api/packages/search?query=training

# Filter by playlist count
GET /api/packages/search?minPlaylists=3&maxPlaylists=10

# Filter by video count
GET /api/packages/search?minVideos=10&maxVideos=50

# Combined filters
GET /api/packages/search?query=safety&minPlaylists=2&minVideos=5
```

**Search Behavior:**
- Text search is case-insensitive
- Searches both package names and playlist names
- All filters are applied as AND conditions
- Results sorted by `lastModified` (newest first)
- Empty results return `{"success": true, "packages": [], "total": 0}`

## Error Responses

All error responses follow a consistent format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;        // Brief error description
  message?: string;     // Detailed error information (optional)
  code?: string;        // Error code for programmatic handling (optional)
}
```

### HTTP Status Codes

| Status | Description | Example Scenarios |
|--------|-------------|-------------------|
| 200 | Success | All successful operations |
| 400 | Bad Request | Invalid query parameters, malformed request |
| 404 | Not Found | Package ID doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database connection issues, R2 storage errors |
| 503 | Service Unavailable | Server overloaded, maintenance mode |

### Error Examples

#### 404 - Package Not Found
```json
{
  "success": false,
  "error": "Package not found",
  "message": "The package 'playlists/invalid-package.zip' does not exist in the storage bucket"
}
```

#### 400 - Bad Request
```json
{
  "success": false,
  "error": "Invalid query parameter",
  "message": "minPlaylists must be a non-negative integer"
}
```

#### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Failed to list packages",
  "message": "Connection timeout when accessing R2 storage"
}
```

#### 503 - Service Unavailable
```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "message": "Server is undergoing maintenance. Please try again later."
}
```

### Error Handling Best Practices

```javascript
async function handleApiRequest(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      // Handle HTTP error status
      throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
    }
    
    if (!data.success) {
      // Handle API-level error
      throw new Error(data.message || data.error);
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
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

## Rate Limiting and Performance

### Performance Characteristics

| Endpoint | Typical Response Time | Notes |
|----------|----------------------|-------|
| `/health` | < 10ms | Simple health check |
| `/packages` (basic) | 100-300ms | Fast metadata lookup |
| `/packages?includeMetadata=true` | 500-2000ms | Requires ZIP processing |
| `/packages/{id}` | 300-800ms | Single package metadata |
| `/packages/{id}/download` | Variable | Depends on package size |
| `/packages/search` | 500-3000ms | Depends on search complexity |

### Rate Limiting (Production)

**Recommended Limits:**
- **Discovery endpoints** (`/packages`, `/search`): 60 requests/minute
- **Download endpoints** (`/download`): 10 requests/minute
- **Health check**: Unlimited

**Implementation Example:**
```javascript
// Express rate limiting middleware
const rateLimit = require('express-rate-limit');

const discoveryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Discovery API rate limit exceeded. Try again later.'
  }
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 downloads per minute
  message: {
    success: false,
    error: 'Download rate limit exceeded',
    message: 'Too many download requests. Please wait before trying again.'
  }
});
```

### Optimization Guidelines

#### For DBTV Remote Applications:
1. **Cache Package Lists**: Cache `/packages` responses for 5-10 minutes
2. **Progressive Loading**: Load basic list first, then detailed metadata on demand
3. **Batch Operations**: Avoid making many individual requests in rapid succession
4. **Use Appropriate Metadata**: Only use `includeMetadata=true` when necessary
5. **Monitor Downloads**: Implement download progress tracking for large packages

#### Example Caching Strategy:
```javascript
class OptimizedDBTVClient {
  constructor(baseUrl, cacheTimeout = 300000) { // 5 minutes
    this.baseUrl = baseUrl;
    this.cacheTimeout = cacheTimeout;
    this.packageListCache = null;
    this.packageDetailCache = new Map();
  }

  async getPackageList(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && this.packageListCache && 
        (now - this.packageListCache.timestamp) < this.cacheTimeout) {
      return this.packageListCache.data;
    }

    const response = await fetch(`${this.baseUrl}/packages`);
    const data = await response.json();
    
    this.packageListCache = {
      data: data,
      timestamp: now
    };
    
    return data;
  }
}
```

## Security Considerations

### Development vs Production

**Development (Current):**
- No authentication required
- CORS origin: `*` or specific localhost
- HTTP connections allowed
- No rate limiting

**Production Requirements:**
1. **Authentication**: Implement API keys or JWT tokens
2. **HTTPS Only**: Force HTTPS connections
3. **Rate Limiting**: Prevent abuse and ensure fair usage
4. **CORS Restrictions**: Limit to trusted domains only
5. **Input Validation**: Sanitize all query parameters
6. **Logging & Monitoring**: Track usage and detect anomalies
7. **Error Message Security**: Avoid exposing internal details

### Production Configuration Example:

```javascript
// Environment variables for production
API_PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-dbtv-remote.com,https://your-admin-panel.com
API_KEY_SECRET=your-secret-key-for-jwt
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_DISCOVERY_MAX=60
RATE_LIMIT_DOWNLOAD_MAX=10
```

### Security Headers:
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

## Related Documentation

- **OpenAPI Specification**: `openapi.yaml` - Machine-readable API specification
- **Integration Guide**: `DBTV_REMOTE_INTEGRATION.md` - Comprehensive integration examples
- **Package Structure**: `PACKAGE_STRUCTURE.md` - ZIP content format documentation
- **Client SDK**: `examples/dbtv-client.js` - Reference implementation
- **Setup Guide**: `README.md` - Server setup and configuration