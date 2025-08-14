# DBTV Remote Integration Guide

This guide provides comprehensive instructions for integrating DBTV remote systems with the DBTV Playlist Manager API.

## Table of Contents
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Integration Patterns](#integration-patterns)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Real-World Examples](#real-world-examples)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. API Endpoint
```
Base URL: http://your-server:3001/api
```

### 2. Basic Package Listing
```javascript
// Get all available packages
const response = await fetch('http://your-server:3001/api/packages');
const data = await response.json();

if (data.success) {
  console.log(`Found ${data.total} packages`);
  data.packages.forEach(pkg => {
    console.log(`${pkg.packageName} - ${pkg.playlistCount} playlists`);
  });
}
```

### 3. Download and Process Package
```javascript
// Download a package
const packageId = 'playlists/training-package-2024-01-15T10-30-00-dbtv-package.zip';
const downloadUrl = `http://your-server:3001/api/packages/${encodeURIComponent(packageId)}/download`;

const response = await fetch(downloadUrl);
const blob = await response.blob();
// Process the ZIP file using your preferred ZIP library
```

## Authentication

### Current Status
The API currently operates without authentication for development purposes.

### Production Authentication
For production deployment, implement one of these authentication methods:

#### API Key Authentication
```javascript
const headers = {
  'Authorization': 'Bearer your-api-key',
  'Content-Type': 'application/json'
};

const response = await fetch('http://your-server:3001/api/packages', { headers });
```

#### JWT Token Authentication
```javascript
const token = await getJWTToken(); // Your auth method
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

const response = await fetch('http://your-server:3001/api/packages', { headers });
```

## Integration Patterns

### 1. Synchronous Package Discovery
Use this pattern when you need immediate package information:

```javascript
class DBTVApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async discoverPackages() {
    try {
      const response = await fetch(`${this.baseUrl}/packages?includeMetadata=true`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      return data.packages.map(pkg => ({
        id: pkg.id,
        name: pkg.packageName,
        playlists: pkg.playlistCount || 0,
        videos: pkg.videoCount || 0,
        size: pkg.size,
        lastModified: new Date(pkg.lastModified)
      }));
    } catch (error) {
      console.error('Failed to discover packages:', error);
      throw error;
    }
  }
}
```

### 2. Asynchronous Package Processing
Use this pattern for background processing of packages:

```javascript
class DBTVPackageProcessor {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.processingQueue = [];
  }

  async queuePackageForProcessing(packageId) {
    this.processingQueue.push({
      id: packageId,
      status: 'queued',
      timestamp: new Date()
    });
    
    // Process in background
    this.processPackage(packageId);
  }

  async processPackage(packageId) {
    try {
      // Update status
      this.updatePackageStatus(packageId, 'downloading');
      
      // Download package
      const blob = await this.downloadPackage(packageId);
      
      // Update status
      this.updatePackageStatus(packageId, 'extracting');
      
      // Extract and process
      const packageData = await this.extractPackage(blob);
      
      // Update status
      this.updatePackageStatus(packageId, 'completed');
      
      return packageData;
    } catch (error) {
      this.updatePackageStatus(packageId, 'failed', error.message);
      throw error;
    }
  }

  async downloadPackage(packageId) {
    const response = await fetch(
      `${this.apiClient.baseUrl}/packages/${encodeURIComponent(packageId)}/download`
    );
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  }
}
```

### 3. Smart Caching Strategy
Implement caching to reduce API calls:

```javascript
class CachedDBTVClient {
  constructor(baseUrl, cacheTimeout = 300000) { // 5 minutes default
    this.baseUrl = baseUrl;
    this.cacheTimeout = cacheTimeout;
    this.cache = new Map();
  }

  async getPackages(includeMetadata = false) {
    const cacheKey = `packages_${includeMetadata}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const response = await fetch(
      `${this.baseUrl}/packages?includeMetadata=${includeMetadata}`
    );
    const data = await response.json();

    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });

    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

## Error Handling

### Comprehensive Error Handler
```javascript
class DBTVErrorHandler {
  static async handleApiResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      switch (response.status) {
        case 404:
          throw new PackageNotFoundError(errorData.error || 'Package not found');
        case 500:
          throw new ServerError(errorData.message || 'Internal server error');
        case 503:
          throw new ServiceUnavailableError('Service temporarily unavailable');
        default:
          throw new APIError(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }
    }
    
    return response;
  }
}

// Custom error classes
class APIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'APIError';
  }
}

class PackageNotFoundError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'PackageNotFoundError';
  }
}

class ServerError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'ServerError';
  }
}

class ServiceUnavailableError extends APIError {
  constructor(message) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}
```

### Retry Logic with Exponential Backoff
```javascript
class RetryableDBTVClient {
  constructor(baseUrl, maxRetries = 3) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
  }

  async fetchWithRetry(url, options = {}, retryCount = 0) {
    try {
      const response = await fetch(url, options);
      return await DBTVErrorHandler.handleApiResponse(response);
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  shouldRetry(error) {
    return error instanceof ServiceUnavailableError || 
           error instanceof ServerError ||
           error.message.includes('network');
  }
}
```

## Performance Considerations

### 1. Batch Operations
```javascript
// Efficient batch package discovery
async function batchDiscoverPackages(packageIds, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < packageIds.length; i += batchSize) {
    const batch = packageIds.slice(i, i + batchSize);
    const batchPromises = batch.map(id => getPackageDetails(id));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
      // Handle partial failures
    }
  }
  
  return results;
}
```

### 2. Progressive Loading
```javascript
// Load package list first, then metadata on demand
async function progressivePackageLoading() {
  // Step 1: Get basic package list (fast)
  const basicPackages = await fetch('/api/packages').then(r => r.json());
  
  // Step 2: Display basic info immediately
  displayPackageList(basicPackages.packages);
  
  // Step 3: Load metadata for visible packages
  const visiblePackages = getVisiblePackages();
  for (const pkg of visiblePackages) {
    const details = await fetch(`/api/packages/${encodeURIComponent(pkg.id)}`);
    updatePackageDisplay(pkg.id, await details.json());
  }
}
```

### 3. Connection Pooling and Keep-Alive
```javascript
// Use HTTP/2 and connection reuse
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 30000
});

const client = new DBTVApiClient(baseUrl, { agent });
```

## Real-World Examples

### Example 1: DBTV Remote Dashboard
```javascript
class DBTVRemoteDashboard {
  constructor(apiBaseUrl) {
    this.api = new RetryableDBTVClient(apiBaseUrl);
    this.packages = [];
    this.filters = {};
  }

  async initialize() {
    try {
      // Load package list
      this.showLoading('Loading packages...');
      const response = await this.api.fetchWithRetry('/packages');
      const data = await response.json();
      
      this.packages = data.packages;
      this.renderPackageGrid();
      
    } catch (error) {
      this.showError('Failed to load packages', error);
    }
  }

  async searchPackages(query) {
    try {
      const searchUrl = `/packages/search?query=${encodeURIComponent(query)}`;
      const response = await this.api.fetchWithRetry(searchUrl);
      const data = await response.json();
      
      this.packages = data.packages;
      this.renderPackageGrid();
      
    } catch (error) {
      this.showError('Search failed', error);
    }
  }

  async downloadPackage(packageId) {
    try {
      this.showDownloadProgress(packageId, 0);
      
      const downloadUrl = `/packages/${encodeURIComponent(packageId)}/download`;
      const response = await this.api.fetchWithRetry(downloadUrl);
      
      // Monitor download progress
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length');
      let receivedLength = 0;
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        const progress = (receivedLength / contentLength) * 100;
        this.updateDownloadProgress(packageId, progress);
      }
      
      const blob = new Blob(chunks);
      this.processDownloadedPackage(packageId, blob);
      
    } catch (error) {
      this.showError(`Download failed for ${packageId}`, error);
    }
  }
}
```

### Example 2: DBTV Content Synchronizer
```javascript
class DBTVContentSynchronizer {
  constructor(apiClient, localStorage) {
    this.api = apiClient;
    this.storage = localStorage;
    this.syncInterval = 300000; // 5 minutes
  }

  async startSyncProcess() {
    // Initial sync
    await this.performSync();
    
    // Schedule periodic sync
    setInterval(() => this.performSync(), this.syncInterval);
  }

  async performSync() {
    try {
      console.log('Starting content synchronization...');
      
      // Get remote packages
      const remotePackages = await this.api.getPackages(true);
      
      // Get local packages
      const localPackages = await this.storage.getPackages();
      
      // Find differences
      const newPackages = this.findNewPackages(remotePackages.packages, localPackages);
      const updatedPackages = this.findUpdatedPackages(remotePackages.packages, localPackages);
      
      // Sync new packages
      for (const pkg of newPackages) {
        await this.syncPackage(pkg);
      }
      
      // Update existing packages
      for (const pkg of updatedPackages) {
        await this.updatePackage(pkg);
      }
      
      console.log(`Sync completed: ${newPackages.length} new, ${updatedPackages.length} updated`);
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.handleSyncError(error);
    }
  }

  async syncPackage(packageInfo) {
    try {
      console.log(`Syncing package: ${packageInfo.packageName}`);
      
      // Download package
      const blob = await this.downloadPackageWithProgress(packageInfo.id);
      
      // Extract and store
      const extractedData = await this.extractPackage(blob);
      await this.storage.storePackage(packageInfo.id, extractedData);
      
      // Update metadata
      await this.storage.updatePackageMetadata(packageInfo.id, packageInfo);
      
    } catch (error) {
      console.error(`Failed to sync package ${packageInfo.id}:`, error);
      throw error;
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. CORS Errors
**Problem**: Cross-origin requests blocked
**Solution**:
```javascript
// Server configuration (already handled in the API)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 2. Package Download Timeouts
**Problem**: Large packages cause timeout errors
**Solution**:
```javascript
// Increase timeout and add retry logic
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

try {
  const response = await fetch(downloadUrl, {
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // Process response
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Download timed out, retrying...');
    // Implement retry logic
  }
}
```

#### 3. Memory Issues with Large Packages
**Problem**: Browser runs out of memory when processing large ZIP files
**Solution**:
```javascript
// Stream processing for large files
async function processLargePackage(packageId) {
  const response = await fetch(`/api/packages/${packageId}/download`);
  const reader = response.body.getReader();
  
  // Process in chunks instead of loading entire file
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Process chunk
    await processChunk(value);
  }
}
```

#### 4. Rate Limiting
**Problem**: Too many requests causing 429 errors
**Solution**:
```javascript
class RateLimitedClient {
  constructor(requestsPerSecond = 2) {
    this.requestQueue = [];
    this.requestInterval = 1000 / requestsPerSecond;
    this.lastRequestTime = 0;
  }

  async makeRequest(url, options) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.requestInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
    return fetch(url, options);
  }
}
```

### Debugging Tips

1. **Enable detailed logging**:
```javascript
const DEBUG = true;

function log(message, data = null) {
  if (DEBUG) {
    console.log(`[DBTV-API] ${new Date().toISOString()}: ${message}`, data);
  }
}
```

2. **Monitor API response times**:
```javascript
async function monitoredFetch(url, options) {
  const startTime = Date.now();
  try {
    const response = await fetch(url, options);
    const endTime = Date.now();
    log(`Request to ${url} took ${endTime - startTime}ms`);
    return response;
  } catch (error) {
    const endTime = Date.now();
    log(`Request to ${url} failed after ${endTime - startTime}ms`, error);
    throw error;
  }
}
```

3. **Validate API responses**:
```javascript
function validatePackageResponse(data) {
  if (!data.success) {
    throw new Error(`API Error: ${data.error}`);
  }
  
  if (!Array.isArray(data.packages)) {
    throw new Error('Invalid response: packages should be an array');
  }
  
  return data;
}
```

## Support and Documentation

- **API Reference**: See `openapi.yaml` for complete API specification
- **Full Documentation**: See `API_DOCUMENTATION.md` for detailed endpoint documentation
- **Package Structure**: See `PACKAGE_STRUCTURE.md` for ZIP content format
- **Example Client**: See `examples/dbtv-client.js` for a complete implementation

For additional support, please check the troubleshooting section or open an issue in the repository.