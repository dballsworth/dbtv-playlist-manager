# DBTV Playlist Manager API Server

## Overview
This Express.js server provides REST API endpoints for querying and downloading DBTV playlist packages from Cloudflare R2 storage. It's designed to be consumed by dbtv-remote and dbtv-system applications.

## Features
- List all available packages with metadata
- Get detailed package information
- Download package ZIP files
- Search and filter packages
- CORS support for cross-origin requests

## Quick Start

### 1. Configuration
Copy the `.env.example` file to `.env` and configure your R2 credentials:

```bash
cp .env.example .env
```

Edit `.env` with your R2 configuration:
```env
API_PORT=3001
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
CORS_ORIGIN=http://localhost:5173
```

### 2. Installation
Install dependencies:
```bash
npm install
```

### 3. Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on port 3001 (or the port specified in `.env`).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/packages` | List all packages |
| GET | `/api/packages/:id` | Get package details |
| GET | `/api/packages/:id/download` | Download package |
| GET | `/api/packages/search` | Search packages |

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

## Usage Examples

### List all packages
```bash
curl http://localhost:3001/api/packages
```

### Download a specific package
```bash
curl -O http://localhost:3001/api/packages/PACKAGE_ID/download
```

### Search packages with filters
```bash
curl "http://localhost:3001/api/packages/search?query=training&minVideos=10"
```

## Integration with dbtv-remote and dbtv-system

### JavaScript/TypeScript Example
```javascript
// Configure API client
const API_BASE_URL = 'http://your-server:3001/api';

// List available packages
async function listPackages() {
  const response = await fetch(`${API_BASE_URL}/packages`);
  const data = await response.json();
  return data.packages;
}

// Download a package
async function downloadPackage(packageId) {
  const response = await fetch(`${API_BASE_URL}/packages/${packageId}/download`);
  const blob = await response.blob();
  // Process the ZIP file
  return blob;
}
```

### Python Example
```python
import requests
import zipfile
import io

API_BASE_URL = 'http://your-server:3001/api'

# List packages
def list_packages():
    response = requests.get(f'{API_BASE_URL}/packages')
    return response.json()['packages']

# Download and extract package
def download_package(package_id):
    response = requests.get(f'{API_BASE_URL}/packages/{package_id}/download')
    with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
        # Process package contents
        zip_file.extractall('extracted_package')
```

## Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start index.js --name dbtv-api
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

### Using systemd
Create `/etc/systemd/system/dbtv-api.service`:
```ini
[Unit]
Description=DBTV Playlist Manager API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/server
ExecStart=/usr/bin/node /path/to/server/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Security Considerations

1. **Authentication**: Add API key or JWT authentication for production
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **HTTPS**: Use HTTPS in production with proper SSL certificates
4. **CORS**: Restrict CORS origins to trusted domains
5. **Input Validation**: Validate and sanitize all input parameters
6. **Logging**: Implement comprehensive logging for monitoring

## Troubleshooting

### Connection to R2 fails
- Verify your R2 credentials in `.env`
- Check that the bucket name is correct
- Ensure your IP is whitelisted in R2 settings

### CORS errors
- Update `CORS_ORIGIN` in `.env` to include your client's origin
- Use `*` for development (not recommended for production)

### Package metadata not loading
- Large packages may take time to process
- Use `includeMetadata=false` query parameter for faster response

## Support
For issues or questions, please check the [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) or open an issue in the repository.