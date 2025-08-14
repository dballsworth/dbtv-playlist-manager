#!/usr/bin/env node

/**
 * Utility script to generate metadata files for existing packages
 * Run this once to create metadata files for all packages that don't have them
 */

import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../server/.env') });

// Initialize R2 client
const r2Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Helper function to extract metadata from ZIP
async function extractMetadataFromZip(zipData, packageKey) {
  try {
    const zip = new JSZip();
    await zip.loadAsync(zipData);
    
    const filename = packageKey.split('/').pop() || packageKey;
    const packageName = filename
      .replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-dbtv-package\.zip$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    // Count playlists and videos
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
        if (playlistData.videos) {
          playlistData.videos.forEach(video => {
            videoSet.add(video.filename);
          });
        }
      }
    }
    
    return {
      packageName,
      filename,
      playlistCount: playlists.length,
      videoCount: videoSet.size,
      playlistNames: playlists,
      totalSize: zipData.length,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };
  } catch (error) {
    console.error(`Failed to extract metadata from ${packageKey}:`, error);
    return null;
  }
}

// Main function
async function generateMetadataForAllPackages() {
  console.log('🚀 Starting metadata generation for existing packages...');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🔗 Endpoint: ${process.env.R2_ENDPOINT}`);
  console.log('');
  
  try {
    // List all packages
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'playlists/',
      MaxKeys: 1000
    });
    
    const listResponse = await r2Client.send(listCommand);
    const packages = (listResponse.Contents || []).filter(obj => obj.Key.endsWith('.zip'));
    
    console.log(`Found ${packages.length} packages to process`);
    console.log('');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const pkg of packages) {
      const metadataKey = pkg.Key.replace(/\.zip$/, '.meta.json');
      
      // Check if metadata already exists
      try {
        const headCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metadataKey
        });
        await r2Client.send(headCommand);
        console.log(`⏭️  Skipping ${pkg.Key} - metadata already exists`);
        skipCount++;
        continue;
      } catch (err) {
        // Metadata doesn't exist, continue with generation
      }
      
      try {
        console.log(`📥 Processing ${pkg.Key}...`);
        
        // Download the package
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: pkg.Key
        });
        const getResponse = await r2Client.send(getCommand);
        const zipData = await getResponse.Body.transformToByteArray();
        
        // Extract metadata
        const metadata = await extractMetadataFromZip(zipData, pkg.Key);
        if (!metadata) {
          throw new Error('Failed to extract metadata');
        }
        
        // Save metadata to R2
        const metadataJson = JSON.stringify(metadata, null, 2);
        const putCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: metadataKey,
          Body: metadataJson,
          ContentType: 'application/json'
        });
        
        await r2Client.send(putCommand);
        console.log(`✅ Generated metadata for ${pkg.Key}`);
        console.log(`   - Playlists: ${metadata.playlistCount}`);
        console.log(`   - Videos: ${metadata.videoCount}`);
        console.log(`   - Size: ${(metadata.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
        
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to process ${pkg.Key}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Successfully generated: ${successCount}`);
    console.log(`   ⏭️  Already had metadata: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('');
    console.log('✨ Metadata generation complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
generateMetadataForAllPackages();