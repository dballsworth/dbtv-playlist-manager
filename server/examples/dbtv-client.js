/**
 * DBTV API Client SDK
 * 
 * A comprehensive JavaScript/TypeScript client for the DBTV Playlist Manager API.
 * Provides high-level methods for interacting with the API, including error handling,
 * caching, retry logic, and progress tracking.
 * 
 * @example
 * const client = new DBTVClient('http://localhost:3001/api');
 * const packages = await client.getPackages();
 * console.log(`Found ${packages.length} packages`);
 */

/**
 * @typedef {Object} Package
 * @property {string} id - Unique package identifier
 * @property {string} filename - Original ZIP filename
 * @property {string} packageName - Human-readable name
 * @property {number} size - Size in bytes
 * @property {string} lastModified - ISO 8601 timestamp
 * @property {string} downloadUrl - Relative download URL
 * @property {number} [playlistCount] - Number of playlists
 * @property {string[]} [playlistNames] - Playlist names
 * @property {number} [videoCount] - Total unique videos
 */

/**
 * @typedef {Object} SearchOptions
 * @property {string} [query] - Search term
 * @property {number} [minPlaylists] - Minimum playlist count
 * @property {number} [maxPlaylists] - Maximum playlist count
 * @property {number} [minVideos] - Minimum video count
 * @property {number} [maxVideos] - Maximum video count
 */

/**
 * @typedef {Object} ClientOptions
 * @property {number} [timeout] - Request timeout in milliseconds
 * @property {number} [retryAttempts] - Number of retry attempts
 * @property {boolean} [enableCache] - Enable response caching
 * @property {number} [cacheTimeout] - Cache timeout in milliseconds
 * @property {string} [apiKey] - API key for authentication
 */

/**
 * Custom error classes for better error handling
 */
class DBTVApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'DBTVApiError';
    this.status = status;
    this.response = response;
  }
}

class PackageNotFoundError extends DBTVApiError {
  constructor(packageId) {
    super(`Package not found: ${packageId}`, 404);
    this.name = 'PackageNotFoundError';
    this.packageId = packageId;
  }
}

class RateLimitError extends DBTVApiError {
  constructor(retryAfter) {
    super('Rate limit exceeded', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Main DBTV API Client
 */
class DBTVClient {
  /**
   * Create a new DBTV API client
   * @param {string} baseUrl - Base URL of the DBTV API (e.g., 'http://localhost:3001/api')
   * @param {ClientOptions} [options] - Client configuration options
   */
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.options = {
      timeout: 30000,
      retryAttempts: 3,
      enableCache: true,
      cacheTimeout: 300000, // 5 minutes
      ...options
    };
    
    // Initialize cache
    this.cache = new Map();
    
    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  /**
   * Add a request interceptor
   * @param {Function} interceptor - Function to modify request options
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   * @param {Function} interceptor - Function to modify response data
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make an HTTP request with retry logic and error handling
   * @private
   */
  async _request(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Apply request interceptors
    let requestOptions = {
      timeout: this.options.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
      },
      ...options
    };

    for (const interceptor of this.requestInterceptors) {
      requestOptions = await interceptor(requestOptions);
    }

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new RateLimitError(retryAfter);
      }

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('application/zip')) {
        data = await response.blob();
      } else {
        data = await response.text();
      }

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 404 && endpoint.includes('/packages/')) {
          const packageId = endpoint.split('/packages/')[1].split('/')[0];
          throw new PackageNotFoundError(decodeURIComponent(packageId));
        }
        
        const errorMessage = data?.error || data?.message || response.statusText;
        throw new DBTVApiError(errorMessage, response.status, data);
      }

      // Handle API-level errors (for JSON responses)
      if (data?.success === false) {
        throw new DBTVApiError(data.message || data.error, response.status, data);
      }

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        data = await interceptor(data, response);
      }

      return { data, response };

    } catch (error) {
      // Handle network errors and timeouts
      if (error.name === 'AbortError') {
        error = new DBTVApiError('Request timeout', 408);
      }

      // Retry logic
      if (retryCount < this.options.retryAttempts && this._shouldRetry(error)) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying request in ${delay}ms (attempt ${retryCount + 1}/${this.options.retryAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._request(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Determine if a request should be retried
   * @private
   */
  _shouldRetry(error) {
    if (error instanceof RateLimitError) return false;
    if (error instanceof PackageNotFoundError) return false;
    
    return error.status >= 500 || 
           error.name === 'NetworkError' || 
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  /**
   * Get from cache or make request
   * @private
   */
  async _getCached(cacheKey, requestFn) {
    if (!this.options.enableCache) {
      return requestFn();
    }

    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.options.cacheTimeout) {
      return cached.data;
    }

    const data = await requestFn();
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  async health() {
    const { data } = await this._request('/health');
    return data;
  }

  /**
   * Get all packages
   * @param {boolean} [includeMetadata=false] - Include playlist and video counts
   * @returns {Promise<Package[]>} Array of packages
   */
  async getPackages(includeMetadata = false) {
    const cacheKey = `packages_${includeMetadata}`;
    
    return this._getCached(cacheKey, async () => {
      const endpoint = `/packages${includeMetadata ? '?includeMetadata=true' : ''}`;
      const { data } = await this._request(endpoint);
      return data.packages;
    });
  }

  /**
   * Get package details by ID
   * @param {string} packageId - Package identifier
   * @returns {Promise<Package>} Package details
   */
  async getPackage(packageId) {
    const cacheKey = `package_${packageId}`;
    
    return this._getCached(cacheKey, async () => {
      const endpoint = `/packages/${encodeURIComponent(packageId)}`;
      const { data } = await this._request(endpoint);
      return data.package;
    });
  }

  /**
   * Search packages
   * @param {SearchOptions} searchOptions - Search criteria
   * @returns {Promise<Package[]>} Array of matching packages
   */
  async searchPackages(searchOptions = {}) {
    const params = new URLSearchParams();
    
    Object.entries(searchOptions).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const cacheKey = `search_${queryString}`;
    
    return this._getCached(cacheKey, async () => {
      const endpoint = `/packages/search${queryString ? `?${queryString}` : ''}`;
      const { data } = await this._request(endpoint);
      return data.packages;
    });
  }

  /**
   * Download a package
   * @param {string} packageId - Package identifier
   * @param {Function} [onProgress] - Progress callback (received, total) => void
   * @returns {Promise<Blob>} Package ZIP file as Blob
   */
  async downloadPackage(packageId, onProgress) {
    const endpoint = `/packages/${encodeURIComponent(packageId)}/download`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          ...(this.options.apiKey && { 'Authorization': `Bearer ${this.options.apiKey}` })
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new PackageNotFoundError(packageId);
        }
        throw new DBTVApiError(`Download failed: ${response.statusText}`, response.status);
      }

      // Handle progress tracking
      if (onProgress && response.body) {
        const contentLength = parseInt(response.headers.get('Content-Length') || '0');
        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          if (contentLength > 0) {
            onProgress(receivedLength, contentLength);
          }
        }

        return new Blob(chunks);
      }

      return response.blob();

    } catch (error) {
      if (error instanceof DBTVApiError) throw error;
      throw new DBTVApiError(`Download failed: ${error.message}`, 500);
    }
  }

  /**
   * Download and extract package contents (requires JSZip)
   * @param {string} packageId - Package identifier
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>} Extracted package contents
   */
  async downloadAndExtractPackage(packageId, onProgress) {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required for package extraction. Please include JSZip in your project.');
    }

    const blob = await this.downloadPackage(packageId, onProgress);
    const zip = new JSZip();
    await zip.loadAsync(blob);

    const contents = {
      playlists: {},
      videos: {},
      metadata: null
    };

    // Extract playlists
    const playlistFiles = Object.keys(zip.files).filter(path => 
      path.startsWith('content/playlists/') && path.endsWith('.json')
    );

    for (const filePath of playlistFiles) {
      const file = zip.file(filePath);
      if (file) {
        const content = await file.async('text');
        const playlistName = filePath.split('/').pop().replace('.json', '');
        contents.playlists[playlistName] = JSON.parse(content);
      }
    }

    // Extract video file references (not the actual video data)
    const videoFiles = Object.keys(zip.files).filter(path => 
      path.startsWith('content/videos/')
    );

    for (const filePath of videoFiles) {
      const file = zip.file(filePath);
      if (file) {
        const fileName = filePath.split('/').pop();
        contents.videos[fileName] = {
          path: filePath,
          size: file._data?.uncompressedSize || 0
        };
      }
    }

    // Extract metadata if present
    const metadataFiles = Object.keys(zip.files).filter(path => 
      path.endsWith('.meta.json')
    );

    if (metadataFiles.length > 0) {
      const file = zip.file(metadataFiles[0]);
      if (file) {
        const content = await file.async('text');
        contents.metadata = JSON.parse(content);
      }
    }

    return contents;
  }

  /**
   * Get package statistics
   * @returns {Promise<Object>} Package statistics
   */
  async getStatistics() {
    const packages = await this.getPackages(true);
    
    return {
      totalPackages: packages.length,
      totalPlaylists: packages.reduce((sum, pkg) => sum + (pkg.playlistCount || 0), 0),
      totalVideos: packages.reduce((sum, pkg) => sum + (pkg.videoCount || 0), 0),
      totalSize: packages.reduce((sum, pkg) => sum + (pkg.size || 0), 0),
      averagePackageSize: packages.length > 0 ? 
        packages.reduce((sum, pkg) => sum + (pkg.size || 0), 0) / packages.length : 0,
      latestPackage: packages.length > 0 ? 
        packages.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0] : null
    };
  }

  /**
   * Batch operation helper
   * @param {Array} items - Items to process
   * @param {Function} operation - Operation to perform on each item
   * @param {number} [batchSize=5] - Number of concurrent operations
   * @returns {Promise<Array>} Results array
   */
  async batch(items, operation, batchSize = 5) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(operation);
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        // Add null results for failed batch to maintain array structure
        results.push(...new Array(batch.length).fill(null));
      }
    }
    
    return results;
  }
}

/**
 * Utility functions
 */
const DBTVUtils = {
  /**
   * Format file size in human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Format time duration
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Validate package ID format
   * @param {string} packageId - Package ID to validate
   * @returns {boolean} True if valid
   */
  isValidPackageId(packageId) {
    return /^playlists\/.*-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/.test(packageId);
  },

  /**
   * Extract package name from filename
   * @param {string} filename - Package filename
   * @returns {string} Extracted package name
   */
  extractPackageName(filename) {
    return filename
      .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DBTVClient, DBTVApiError, PackageNotFoundError, RateLimitError, DBTVUtils };
} else if (typeof window !== 'undefined') {
  window.DBTVClient = DBTVClient;
  window.DBTVApiError = DBTVApiError;
  window.PackageNotFoundError = PackageNotFoundError;
  window.RateLimitError = RateLimitError;
  window.DBTVUtils = DBTVUtils;
}

/* 
Example Usage:

// Basic usage
const client = new DBTVClient('http://localhost:3001/api');

// With options
const client = new DBTVClient('http://localhost:3001/api', {
  timeout: 60000,
  retryAttempts: 5,
  enableCache: true,
  cacheTimeout: 600000, // 10 minutes
  apiKey: 'your-api-key'
});

// List packages
const packages = await client.getPackages(true);
console.log(`Found ${packages.length} packages`);

// Search packages
const trainingPackages = await client.searchPackages({
  query: 'training',
  minVideos: 5
});

// Download with progress
const packageBlob = await client.downloadPackage(packageId, (received, total) => {
  const progress = (received / total) * 100;
  console.log(`Download progress: ${progress.toFixed(1)}%`);
});

// Get statistics
const stats = await client.getStatistics();
console.log(`Total packages: ${stats.totalPackages}`);
console.log(`Total size: ${DBTVUtils.formatFileSize(stats.totalSize)}`);

// Error handling
try {
  const package = await client.getPackage('invalid-id');
} catch (error) {
  if (error instanceof PackageNotFoundError) {
    console.log(`Package ${error.packageId} not found`);
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limit exceeded, retry after ${error.retryAfter} seconds`);
  } else {
    console.error('API error:', error.message);
  }
}
*/