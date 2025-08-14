/**
 * DBTV API Client Usage Examples
 * 
 * This file demonstrates various ways to use the DBTV API Client SDK
 * for common integration scenarios with DBTV remote systems.
 */

// Import the client (adjust path as needed)
// const { DBTVClient, DBTVUtils } = require('./dbtv-client.js');

/**
 * Example 1: Basic Package Discovery
 */
async function basicPackageDiscovery() {
  console.log('=== Basic Package Discovery ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    // Check API health
    const health = await client.health();
    console.log('API Status:', health.status);
    
    // Get all packages without metadata (fast)
    const packages = await client.getPackages();
    console.log(`Found ${packages.length} packages`);
    
    // Display basic package info
    packages.forEach(pkg => {
      console.log(`- ${pkg.packageName} (${DBTVUtils.formatFileSize(pkg.size)})`);
    });
    
  } catch (error) {
    console.error('Discovery failed:', error.message);
  }
}

/**
 * Example 2: Detailed Package Information
 */
async function detailedPackageInfo() {
  console.log('\n=== Detailed Package Information ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    // Get packages with full metadata (slower but comprehensive)
    const packages = await client.getPackages(true);
    
    packages.forEach(pkg => {
      console.log(`\nPackage: ${pkg.packageName}`);
      console.log(`  Size: ${DBTVUtils.formatFileSize(pkg.size)}`);
      console.log(`  Playlists: ${pkg.playlistCount || 'Unknown'}`);
      console.log(`  Videos: ${pkg.videoCount || 'Unknown'}`);
      console.log(`  Last Modified: ${new Date(pkg.lastModified).toLocaleDateString()}`);
      
      if (pkg.playlistNames && pkg.playlistNames.length > 0) {
        console.log(`  Playlist Names:`);
        pkg.playlistNames.forEach(name => console.log(`    - ${name}`));
      }
    });
    
  } catch (error) {
    console.error('Failed to get detailed info:', error.message);
  }
}

/**
 * Example 3: Searching and Filtering
 */
async function searchingAndFiltering() {
  console.log('\n=== Searching and Filtering ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    // Search for training packages
    const trainingPackages = await client.searchPackages({
      query: 'training'
    });
    console.log(`Found ${trainingPackages.length} training packages`);
    
    // Find packages with specific criteria
    const largePackages = await client.searchPackages({
      minVideos: 10,
      minPlaylists: 3
    });
    console.log(`Found ${largePackages.length} large packages (10+ videos, 3+ playlists)`);
    
    // Complex search
    const specificPackages = await client.searchPackages({
      query: 'safety',
      minVideos: 5,
      maxVideos: 20
    });
    console.log(`Found ${specificPackages.length} safety packages with 5-20 videos`);
    
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

/**
 * Example 4: Package Download with Progress
 */
async function packageDownloadWithProgress() {
  console.log('\n=== Package Download with Progress ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    // Get first available package
    const packages = await client.getPackages();
    if (packages.length === 0) {
      console.log('No packages available for download');
      return;
    }
    
    const packageToDownload = packages[0];
    console.log(`Downloading: ${packageToDownload.packageName}`);
    
    // Download with progress tracking
    const blob = await client.downloadPackage(
      packageToDownload.id,
      (received, total) => {
        const progress = (received / total) * 100;
        process.stdout.write(`\rProgress: ${progress.toFixed(1)}% (${DBTVUtils.formatFileSize(received)}/${DBTVUtils.formatFileSize(total)})`);
      }
    );
    
    console.log(`\nDownload complete! Size: ${DBTVUtils.formatFileSize(blob.size)}`);
    
    // In a browser environment, you could save the file like this:
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = packageToDownload.filename;
    // a.click();
    
  } catch (error) {
    console.error('\nDownload failed:', error.message);
  }
}

/**
 * Example 5: Package Extraction and Analysis
 */
async function packageExtractionAndAnalysis() {
  console.log('\n=== Package Extraction and Analysis ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    // Note: This requires JSZip library to be available
    // In Node.js: npm install jszip
    // In browser: <script src="https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js"></script>
    
    const packages = await client.getPackages();
    if (packages.length === 0) {
      console.log('No packages available for extraction');
      return;
    }
    
    const packageToExtract = packages[0];
    console.log(`Extracting: ${packageToExtract.packageName}`);
    
    // This will only work if JSZip is available
    // const contents = await client.downloadAndExtractPackage(packageToExtract.id);
    // 
    // console.log(`Playlists found: ${Object.keys(contents.playlists).length}`);
    // console.log(`Videos found: ${Object.keys(contents.videos).length}`);
    // 
    // // Analyze playlists
    // Object.entries(contents.playlists).forEach(([name, playlist]) => {
    //   console.log(`  Playlist: ${playlist.name}`);
    //   console.log(`    Videos: ${playlist.videos.length}`);
    //   playlist.videos.forEach(video => {
    //     console.log(`      - ${video.title} (${video.filename})`);
    //   });
    // });
    
    console.log('Package extraction requires JSZip library (commented out in example)');
    
  } catch (error) {
    console.error('Extraction failed:', error.message);
  }
}

/**
 * Example 6: Caching and Performance Optimization
 */
async function cachingAndPerformance() {
  console.log('\n=== Caching and Performance Optimization ===');
  
  // Create client with custom cache settings
  const client = new DBTVClient('http://localhost:3001/api', {
    enableCache: true,
    cacheTimeout: 600000, // 10 minutes
    retryAttempts: 3,
    timeout: 30000
  });
  
  try {
    console.log('First request (will cache result):');
    const start1 = Date.now();
    const packages1 = await client.getPackages();
    const time1 = Date.now() - start1;
    console.log(`Retrieved ${packages1.length} packages in ${time1}ms`);
    
    console.log('Second request (should use cache):');
    const start2 = Date.now();
    const packages2 = await client.getPackages();
    const time2 = Date.now() - start2;
    console.log(`Retrieved ${packages2.length} packages in ${time2}ms (cached)`);
    
    // Clear cache and request again
    client.clearCache();
    console.log('Third request (cache cleared):');
    const start3 = Date.now();
    const packages3 = await client.getPackages();
    const time3 = Date.now() - start3;
    console.log(`Retrieved ${packages3.length} packages in ${time3}ms`);
    
  } catch (error) {
    console.error('Performance test failed:', error.message);
  }
}

/**
 * Example 7: Error Handling
 */
async function errorHandlingExamples() {
  console.log('\n=== Error Handling Examples ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  // Example 1: Package not found
  try {
    await client.getPackage('invalid-package-id');
  } catch (error) {
    if (error instanceof PackageNotFoundError) {
      console.log(`Package not found: ${error.packageId}`);
    } else {
      console.log('Unexpected error:', error.message);
    }
  }
  
  // Example 2: Network error handling
  const offlineClient = new DBTVClient('http://invalid-url:9999/api', {
    timeout: 5000,
    retryAttempts: 2
  });
  
  try {
    await offlineClient.getPackages();
  } catch (error) {
    console.log('Network error handled:', error.message);
  }
  
  // Example 3: Rate limiting (if implemented)
  try {
    // This would trigger if rate limiting is active
    const promises = Array(100).fill().map(() => client.getPackages());
    await Promise.all(promises);
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.log(`Rate limited, retry after ${error.retryAfter} seconds`);
    }
  }
}

/**
 * Example 8: Statistics and Monitoring
 */
async function statisticsAndMonitoring() {
  console.log('\n=== Statistics and Monitoring ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    const stats = await client.getStatistics();
    
    console.log('Package Statistics:');
    console.log(`  Total Packages: ${stats.totalPackages}`);
    console.log(`  Total Playlists: ${stats.totalPlaylists}`);
    console.log(`  Total Videos: ${stats.totalVideos}`);
    console.log(`  Total Size: ${DBTVUtils.formatFileSize(stats.totalSize)}`);
    console.log(`  Average Package Size: ${DBTVUtils.formatFileSize(stats.averagePackageSize)}`);
    
    if (stats.latestPackage) {
      console.log(`  Latest Package: ${stats.latestPackage.packageName}`);
      console.log(`  Last Modified: ${new Date(stats.latestPackage.lastModified).toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('Statistics failed:', error.message);
  }
}

/**
 * Example 9: Batch Operations
 */
async function batchOperations() {
  console.log('\n=== Batch Operations ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  try {
    const packages = await client.getPackages();
    
    if (packages.length === 0) {
      console.log('No packages available for batch operations');
      return;
    }
    
    // Batch get detailed info for multiple packages
    console.log('Getting detailed info for all packages in batches...');
    const detailedPackages = await client.batch(
      packages.slice(0, 5), // Limit to first 5 for demo
      (pkg) => client.getPackage(pkg.id),
      2 // Process 2 at a time
    );
    
    console.log(`Processed ${detailedPackages.filter(p => p).length} packages successfully`);
    
  } catch (error) {
    console.error('Batch operation failed:', error.message);
  }
}

/**
 * Example 10: Custom Interceptors
 */
async function customInterceptors() {
  console.log('\n=== Custom Interceptors ===');
  
  const client = new DBTVClient('http://localhost:3001/api');
  
  // Add request interceptor for logging
  client.addRequestInterceptor((options) => {
    console.log(`Making request: ${options.method || 'GET'}`);
    return options;
  });
  
  // Add response interceptor for timing
  client.addResponseInterceptor((data, response) => {
    console.log(`Response received with status: ${response.status}`);
    return data;
  });
  
  try {
    await client.getPackages();
    console.log('Interceptors executed successfully');
  } catch (error) {
    console.error('Interceptor example failed:', error.message);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('DBTV API Client SDK Examples');
  console.log('============================\n');
  
  try {
    await basicPackageDiscovery();
    await detailedPackageInfo();
    await searchingAndFiltering();
    await packageDownloadWithProgress();
    await packageExtractionAndAnalysis();
    await cachingAndPerformance();
    await errorHandlingExamples();
    await statisticsAndMonitoring();
    await batchOperations();
    await customInterceptors();
    
    console.log('\n=== All Examples Completed ===');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export functions for individual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    basicPackageDiscovery,
    detailedPackageInfo,
    searchingAndFiltering,
    packageDownloadWithProgress,
    packageExtractionAndAnalysis,
    cachingAndPerformance,
    errorHandlingExamples,
    statisticsAndMonitoring,
    batchOperations,
    customInterceptors,
    runAllExamples
  };
}

// Auto-run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples();
}