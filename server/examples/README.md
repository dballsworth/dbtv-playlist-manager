# DBTV API Client SDK Examples

This directory contains examples and reference implementations for integrating with the DBTV Playlist Manager API.

## Files

### `dbtv-client.js`
Comprehensive JavaScript/TypeScript client SDK for the DBTV API with features including:
- Error handling and retry logic
- Request/response caching
- Progress tracking for downloads
- Batch operations
- Custom interceptors
- TypeScript support

### `dbtv-client.d.ts`
TypeScript definitions for the client SDK providing full type safety and IntelliSense support.

### `usage-examples.js`
Practical examples demonstrating how to use the client SDK for common integration scenarios:
- Package discovery and search
- Download with progress tracking
- Error handling patterns
- Performance optimization
- Batch operations

## Quick Start

### Browser Usage
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js"></script>
    <script src="dbtv-client.js"></script>
</head>
<body>
    <script>
        const client = new DBTVClient('http://localhost:3001/api');
        
        client.getPackages().then(packages => {
            console.log(`Found ${packages.length} packages`);
            packages.forEach(pkg => {
                console.log(`- ${pkg.packageName}`);
            });
        });
    </script>
</body>
</html>
```

### Node.js Usage
```javascript
const { DBTVClient } = require('./dbtv-client.js');

const client = new DBTVClient('http://localhost:3001/api');

async function example() {
    try {
        const packages = await client.getPackages(true);
        console.log(`Found ${packages.length} packages`);
        
        for (const pkg of packages) {
            console.log(`${pkg.packageName}: ${pkg.playlistCount} playlists, ${pkg.videoCount} videos`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
```

### TypeScript Usage
```typescript
import { DBTVClient, Package, SearchOptions } from './dbtv-client';

const client = new DBTVClient('http://localhost:3001/api', {
    timeout: 30000,
    enableCache: true,
    cacheTimeout: 600000
});

async function searchTrainingPackages(): Promise<Package[]> {
    const searchOptions: SearchOptions = {
        query: 'training',
        minVideos: 5
    };
    
    return await client.searchPackages(searchOptions);
}
```

## Running Examples

### Prerequisites
```bash
# For Node.js examples
npm install

# For package extraction features (optional)
npm install jszip
```

### Run All Examples
```bash
node usage-examples.js
```

### Run Individual Examples
```javascript
const examples = require('./usage-examples.js');

// Run specific example
examples.basicPackageDiscovery();
examples.detailedPackageInfo();
examples.searchingAndFiltering();
```

## Configuration Options

### Client Options
```javascript
const client = new DBTVClient('http://localhost:3001/api', {
    timeout: 30000,           // Request timeout in milliseconds
    retryAttempts: 3,         // Number of retry attempts
    enableCache: true,        // Enable response caching
    cacheTimeout: 300000,     // Cache timeout in milliseconds (5 minutes)
    apiKey: 'your-api-key'    // API key for authentication (production)
});
```

### Error Handling
```javascript
try {
    const package = await client.getPackage('invalid-id');
} catch (error) {
    if (error instanceof PackageNotFoundError) {
        console.log(`Package ${error.packageId} not found`);
    } else if (error instanceof RateLimitError) {
        console.log(`Rate limited, retry after ${error.retryAfter} seconds`);
    } else if (error instanceof DBTVApiError) {
        console.log(`API error ${error.status}: ${error.message}`);
    } else {
        console.log(`Unexpected error: ${error.message}`);
    }
}
```

## Advanced Features

### Progress Tracking
```javascript
const blob = await client.downloadPackage(packageId, (received, total) => {
    const progress = (received / total) * 100;
    console.log(`Download progress: ${progress.toFixed(1)}%`);
});
```

### Custom Interceptors
```javascript
// Request interceptor
client.addRequestInterceptor((options) => {
    options.headers['X-Custom-Header'] = 'custom-value';
    return options;
});

// Response interceptor
client.addResponseInterceptor((data, response) => {
    console.log(`Response time: ${response.headers.get('X-Response-Time')}`);
    return data;
});
```

### Batch Operations
```javascript
const packages = await client.getPackages();
const detailedPackages = await client.batch(
    packages,
    (pkg) => client.getPackage(pkg.id),
    3 // Process 3 at a time
);
```

## Integration Patterns

### DBTV Remote Dashboard
Perfect for building remote management interfaces that need to discover and manage content packages.

### Content Synchronization
Ideal for systems that need to sync content between central storage and remote locations.

### Training Management Systems
Use for platforms that manage training content delivery and tracking.

### Digital Signage
Suitable for digital signage systems that need to discover and download content packages.

## Performance Tips

1. **Use Caching**: Enable caching for frequently accessed data
2. **Progressive Loading**: Load basic package list first, then detailed metadata on demand
3. **Batch Downloads**: Use batch operations for multiple packages
4. **Monitor Progress**: Implement progress tracking for better user experience
5. **Handle Errors**: Implement comprehensive error handling with retry logic

## Security Considerations

### Development
- API runs without authentication
- Use localhost or trusted development environments

### Production
- Implement API key authentication
- Use HTTPS connections only
- Configure proper CORS origins
- Implement rate limiting

## Troubleshooting

### Common Issues

**CORS Errors**
- Ensure server CORS configuration includes your origin
- Check browser console for specific CORS error messages

**Network Timeouts**
- Increase timeout setting for large downloads
- Implement retry logic for unreliable connections

**Memory Issues**
- Use streaming for large package downloads
- Clear cache periodically with `client.clearCache()`

**Authentication Errors**
- Verify API key is correct for production environments
- Check authentication headers in network inspector

### Debug Mode
```javascript
// Enable debug logging
const client = new DBTVClient('http://localhost:3001/api');

client.addRequestInterceptor((options) => {
    console.log('Request:', options);
    return options;
});

client.addResponseInterceptor((data, response) => {
    console.log('Response:', response.status, data);
    return data;
});
```

## Contributing

To add new examples or improve existing ones:

1. Follow the existing code style and patterns
2. Include comprehensive error handling
3. Add TypeScript types where applicable
4. Test with both successful and error scenarios
5. Update this README with new examples

## Related Documentation

- **API Documentation**: `../API_DOCUMENTATION.md`
- **Integration Guide**: `../DBTV_REMOTE_INTEGRATION.md`
- **Package Structure**: `../PACKAGE_STRUCTURE.md`
- **OpenAPI Spec**: `../openapi.yaml`