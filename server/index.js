import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import JSZip from 'jszip';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Create HTTPS agent with proper TLS configuration
const httpsAgent = new https.Agent({
  secureProtocol: 'TLSv1_2_method',
  ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS',
  rejectUnauthorized: true,
  keepAlive: true,
  maxSockets: 50
});

// Initialize R2 client with proper request handler
const r2Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler({
    httpsAgent,
    connectionTimeout: 30000,
    socketTimeout: 30000,
  })
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Helper function to get metadata key from package key
function getMetadataKey(packageKey) {
  return packageKey.replace(/\.zip$/, '.meta.json');
}

// Helper function to fetch metadata from R2
async function fetchMetadata(packageKey) {
  try {
    const metadataKey = getMetadataKey(packageKey);
    console.log(`Fetching metadata from ${metadataKey}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: metadataKey
    });
    
    const response = await r2Client.send(command);
    const jsonString = await response.Body.transformToString();
    const metadata = JSON.parse(jsonString);
    
    return {
      playlistCount: metadata.playlistCount,
      playlistNames: metadata.playlistNames,
      videoCount: metadata.videoCount
    };
  } catch (error) {
    console.warn(`No metadata file found for ${packageKey}, will extract from ZIP if needed`);
    return null;
  }
}

// Helper function to extract package metadata from ZIP (fallback)
async function extractPackageMetadata(zipData) {
  try {
    const zip = new JSZip();
    await zip.loadAsync(zipData);
    
    // Count playlists
    const playlistFiles = Object.keys(zip.files)
      .filter(path => path.startsWith('content/playlists/') && path.endsWith('.json'));
    
    const playlists = [];
    const videoSet = new Set();
    
    for (const filePath of playlistFiles) {
      const file = zip.file(filePath);
      if (file) {
        const content = await file.async('text');
        const playlistData = JSON.parse(content);
        playlists.push(playlistData.name);
        
        // Count unique videos
        playlistData.videos.forEach(video => {
          videoSet.add(video.filename);
        });
      }
    }
    
    return {
      playlistCount: playlists.length,
      playlistNames: playlists,
      videoCount: videoSet.size
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {
      playlistCount: 0,
      playlistNames: [],
      videoCount: 0
    };
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// List all packages
app.get('/api/packages', async (req, res) => {
  try {
    console.log('Listing packages from R2...');
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'playlists/',
      MaxKeys: 100
    });
    
    const response = await r2Client.send(command);
    
    const packages = await Promise.all(
      (response.Contents || [])
        .filter(obj => obj.Key.endsWith('.zip'))
        .map(async (obj) => {
          const filename = obj.Key.split('/').pop() || obj.Key;
          const packageName = filename
            .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          // Try to get metadata from metadata file first (fast)
          let metadata = await fetchMetadata(obj.Key);
          
          // If no metadata file and user wants metadata, extract from ZIP (slower)
          if (!metadata && req.query.includeMetadata === 'true') {
            try {
              console.log(`Extracting metadata from ZIP for ${obj.Key}`);
              const getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: obj.Key
              });
              const getResponse = await r2Client.send(getCommand);
              const data = await getResponse.Body.transformToByteArray();
              metadata = await extractPackageMetadata(data);
              
              // TODO: Optionally save this metadata for future use
            } catch (err) {
              console.warn(`Could not extract metadata for ${obj.Key}:`, err);
            }
          }
          
          // Default to empty metadata if not available
          if (!metadata) {
            metadata = {};
          }
          
          return {
            id: obj.Key,
            filename,
            packageName,
            size: obj.Size || 0,
            lastModified: obj.LastModified || new Date(),
            ...metadata,
            downloadUrl: `/api/packages/${encodeURIComponent(obj.Key)}/download`
          };
        })
    );
    
    res.json({
      success: true,
      packages: packages.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      ),
      total: packages.length
    });
  } catch (error) {
    console.error('Error listing packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list packages',
      message: error.message
    });
  }
});

// Get specific package details
app.get('/api/packages/:id', async (req, res) => {
  try {
    const packageId = decodeURIComponent(req.params.id);
    console.log(`Getting package details for: ${packageId}`);
    
    // Get the package file
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: packageId
    });
    
    // Try to get metadata from metadata file first (fast)
    let metadata = await fetchMetadata(packageId);
    
    let data;
    // If no metadata file, get from ZIP
    if (!metadata) {
      const response = await r2Client.send(command);
      data = await response.Body.transformToByteArray();
      metadata = await extractPackageMetadata(data);
    }
    
    const filename = packageId.split('/').pop() || packageId;
    const packageName = filename
      .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    res.json({
      success: true,
      package: {
        id: packageId,
        filename,
        packageName,
        size: metadata.totalSize || 0,
        lastModified: metadata.createdAt || new Date(),
        ...metadata,
        downloadUrl: `/api/packages/${encodeURIComponent(packageId)}/download`
      }
    });
  } catch (error) {
    console.error('Error getting package details:', error);
    
    if (error.name === 'NoSuchKey') {
      res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get package details',
        message: error.message
      });
    }
  }
});

// Download package
app.get('/api/packages/:id/download', async (req, res) => {
  try {
    const packageId = decodeURIComponent(req.params.id);
    console.log(`Downloading package: ${packageId}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: packageId
    });
    
    const response = await r2Client.send(command);
    const data = await response.Body.transformToByteArray();
    
    const filename = packageId.split('/').pop() || 'package.zip';
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', data.length);
    
    res.send(Buffer.from(data));
  } catch (error) {
    console.error('Error downloading package:', error);
    
    if (error.name === 'NoSuchKey') {
      res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to download package',
        message: error.message
      });
    }
  }
});

// Search packages
app.get('/api/packages/search', async (req, res) => {
  try {
    const { query, minPlaylists, maxPlaylists, minVideos, maxVideos } = req.query;
    
    // First get all packages
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'playlists/',
      MaxKeys: 100
    });
    
    const response = await r2Client.send(command);
    
    let packages = await Promise.all(
      (response.Contents || [])
        .filter(obj => obj.Key.endsWith('.zip'))
        .map(async (obj) => {
          const filename = obj.Key.split('/').pop() || obj.Key;
          const packageName = filename
            .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          // Get metadata from metadata file or extract from ZIP
          let metadata = await fetchMetadata(obj.Key);
          if (!metadata) {
            // Fallback to extracting from ZIP (slower)
            try {
              const getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: obj.Key
              });
              const getResponse = await r2Client.send(getCommand);
              const data = await getResponse.Body.transformToByteArray();
              metadata = await extractPackageMetadata(data);
            } catch (err) {
              console.warn(`Could not extract metadata for ${obj.Key}:`, err);
              metadata = {};
            }
          }
          
          return {
            id: obj.Key,
            filename,
            packageName,
            size: obj.Size || 0,
            lastModified: obj.LastModified || new Date(),
            ...metadata,
            downloadUrl: `/api/packages/${encodeURIComponent(obj.Key)}/download`
          };
        })
    );
    
    // Apply filters
    if (query) {
      const searchTerm = query.toLowerCase();
      packages = packages.filter(pkg => 
        pkg.packageName.toLowerCase().includes(searchTerm) ||
        pkg.playlistNames?.some(name => name.toLowerCase().includes(searchTerm))
      );
    }
    
    if (minPlaylists) {
      packages = packages.filter(pkg => pkg.playlistCount >= parseInt(minPlaylists));
    }
    
    if (maxPlaylists) {
      packages = packages.filter(pkg => pkg.playlistCount <= parseInt(maxPlaylists));
    }
    
    if (minVideos) {
      packages = packages.filter(pkg => pkg.videoCount >= parseInt(minVideos));
    }
    
    if (maxVideos) {
      packages = packages.filter(pkg => pkg.videoCount <= parseInt(maxVideos));
    }
    
    res.json({
      success: true,
      packages: packages.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      ),
      total: packages.length
    });
  } catch (error) {
    console.error('Error searching packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search packages',
      message: error.message
    });
  }
});

// Test R2 connection on startup
async function testR2Connection() {
  try {
    console.log('🔧 Testing R2 connection...');
    console.log(`   Endpoint: ${process.env.R2_ENDPOINT}`);
    console.log(`   Bucket: ${BUCKET_NAME}`);
    console.log(`   Access Key: ${process.env.R2_ACCESS_KEY_ID?.substring(0, 8)}...`);
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1
    });
    
    await r2Client.send(command);
    console.log('✅ R2 connection successful!');
  } catch (error) {
    console.error('❌ R2 connection failed:');
    console.error('   Error name:', error.name);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    if (error.message.includes('EPROTO') || error.message.includes('SSL')) {
      console.error('');
      console.error('🔧 SSL/TLS troubleshooting suggestions:');
      console.error('   1. Check your R2_ENDPOINT format (should be https://ACCOUNT_ID.r2.cloudflarestorage.com)');
      console.error('   2. Verify your credentials are correct');
      console.error('   3. Ensure your network allows HTTPS connections to Cloudflare');
      console.error('   4. Try setting NODE_TLS_REJECT_UNAUTHORIZED=0 temporarily for testing');
    }
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 DBTV Playlist Manager API Server running on port ${PORT}`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
  console.log('');
  
  await testR2Connection();
});