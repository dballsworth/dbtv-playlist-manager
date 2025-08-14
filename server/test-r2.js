#!/usr/bin/env node

/**
 * R2 Connection Test Script
 * Use this to test your R2 configuration independently
 */

import dotenv from 'dotenv';
import https from 'https';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

dotenv.config();

console.log('🔧 R2 Connection Test');
console.log('===================');
console.log('');

// Check environment variables
console.log('📋 Configuration:');
console.log(`   R2_ENDPOINT: ${process.env.R2_ENDPOINT || 'NOT SET'}`);
console.log(`   R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME || 'NOT SET'}`);
console.log(`   R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? process.env.R2_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET'}`);
console.log(`   R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? '***SET***' : 'NOT SET'}`);
console.log('');

if (!process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('   Please check your .env file');
  process.exit(1);
}

async function testConnection(clientName, client) {
  try {
    console.log(`🔧 Testing ${clientName}...`);
    
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1
    });
    
    const start = Date.now();
    const result = await client.send(command);
    const duration = Date.now() - start;
    
    console.log(`✅ ${clientName} connection successful! (${duration}ms)`);
    console.log(`   Objects found: ${result.Contents?.length || 0}`);
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ ${clientName} connection failed:`);
    console.error(`   Error: ${error.name}: ${error.message}`);
    console.error('');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting connection tests...');
  console.log('');

  // Test 1: Default configuration
  const defaultClient = new S3Client({
    region: 'us-east-1',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const test1 = await testConnection('Default Client', defaultClient);

  // Test 2: With custom TLS configuration
  const httpsAgent = new https.Agent({
    secureProtocol: 'TLSv1_2_method',
    ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS',
    rejectUnauthorized: true,
    keepAlive: true,
    maxSockets: 50
  });

  const tlsClient = new S3Client({
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

  const test2 = await testConnection('TLS-Configured Client', tlsClient);

  // Test 3: With relaxed SSL (if previous tests failed)
  if (!test1 && !test2) {
    console.log('⚠️  Trying with relaxed SSL verification...');
    console.log('   (This is NOT recommended for production!)');
    console.log('');

    const relaxedAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
    });

    const relaxedClient = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      requestHandler: new NodeHttpHandler({
        httpsAgent: relaxedAgent,
        connectionTimeout: 30000,
        socketTimeout: 30000,
      })
    });

    await testConnection('Relaxed SSL Client', relaxedClient);
  }

  console.log('🏁 Test complete!');
  
  if (!test1 && !test2) {
    console.log('');
    console.log('🔧 Troubleshooting suggestions:');
    console.log('   1. Verify your R2 endpoint URL format');
    console.log('   2. Check that your credentials are correct');
    console.log('   3. Ensure your network allows HTTPS to Cloudflare');
    console.log('   4. Try temporarily setting NODE_TLS_REJECT_UNAUTHORIZED=0');
    console.log('   5. Check if you\'re behind a corporate firewall');
  }
}

runTests().catch(console.error);