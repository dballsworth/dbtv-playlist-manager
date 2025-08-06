import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { R2Config } from '../types';

export class R2Client {
  private s3Client: S3Client | null = null;
  private config: R2Config | null = null;

  constructor(config?: R2Config) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure the R2 client with credentials and endpoint
   */
  configure(config: R2Config) {
    this.config = config;
    
    // Create S3-compatible client for Cloudflare R2
    this.s3Client = new S3Client({
      region: 'us-east-1', // R2 works better with a standard AWS region
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // R2 specific configuration
      forcePathStyle: true,
    });
  }

  /**
   * Test connection to R2 bucket
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.s3Client || !this.config) {
      return { success: false, error: 'Client not configured' };
    }

    try {
      console.log('Testing R2 connection with config:', {
        endpoint: this.config.endpoint,
        bucketName: this.config.bucketName,
        region: this.config.region,
        accessKeyId: this.config.accessKeyId.substring(0, 8) + '...',
      });

      // Try to list objects in bucket to test connection (more reliable than HeadBucket)
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        MaxKeys: 1, // Only need to check if we can access the bucket
      });

      const result = await this.s3Client.send(command);
      console.log('R2 connection successful:', result);
      
      return { success: true };
    } catch (error) {
      console.error('R2 connection test failed:', error);
      console.error('Full error details:', {
        name: (error as Error & { name?: string }).name,
        code: (error as Error & { code?: string }).code,
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: (error as Error & { $metadata?: any }).$metadata?.httpStatusCode,
        requestId: (error as Error & { $metadata?: any }).$metadata?.requestId,
      });
      
      // Parse common R2/S3 errors for user-friendly messages
      const errorName = (error as Error & { name?: string }).name;
      const errorCode = (error as Error & { code?: string }).code;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = (error as Error & { $metadata?: any }).$metadata?.httpStatusCode;
      
      if (errorName === 'NoSuchBucket') {
        return { success: false, error: `Bucket '${this.config.bucketName}' does not exist` };
      }
      
      if (errorName === 'InvalidAccessKeyId') {
        return { success: false, error: 'Invalid Access Key ID' };
      }
      
      if (errorName === 'SignatureDoesNotMatch') {
        return { success: false, error: 'Invalid Secret Access Key' };
      }
      
      if (errorName === 'AccessDenied') {
        return { success: false, error: 'Access denied - check your permissions' };
      }

      if (errorCode === 'NetworkingError' || errorName === 'NetworkingError') {
        return { success: false, error: 'Network error - check your endpoint URL and internet connection' };
      }

      if (statusCode === 403) {
        return { success: false, error: 'Access denied - check your credentials and permissions' };
      }

      if (statusCode === 404) {
        return { success: false, error: `Bucket '${this.config.bucketName}' not found` };
      }

      // CORS-related errors
      if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
        return { success: false, error: 'CORS error - check bucket CORS configuration' };
      }

      // General network/load errors
      if (errorMessage.includes('Load failed') || errorMessage.includes('fetch')) {
        return { success: false, error: 'Network request failed - check endpoint URL and CORS settings' };
      }
      
      return { 
        success: false, 
        error: `Connection failed: ${errorMessage} (${errorName || 'Unknown error type'})` 
      };
    }
  }

  /**
   * List objects in the bucket with optional prefix
   */
  async listObjects(prefix?: string, maxKeys?: number): Promise<{
    objects: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
    }>;
    isTruncated: boolean;
    nextContinuationToken?: string;
  }> {
    if (!this.s3Client || !this.config) {
      throw new Error('Client not configured');
    }

    const command = new ListObjectsV2Command({
      Bucket: this.config.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys || 1000,
    });

    const response = await this.s3Client.send(command);

    return {
      objects: (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        etag: obj.ETag || '',
      })),
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  /**
   * Upload a file to R2
   */
  async uploadFile(
    key: string, 
    file: File | ArrayBuffer | Uint8Array, 
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      onProgress?: (progress: number) => void;
    }
  ): Promise<{ success: boolean; error?: string; etag?: string }> {
    if (!this.s3Client || !this.config) {
      return { success: false, error: 'Client not configured' };
    }

    try {
      const body = file instanceof File ? await file.arrayBuffer() : file;
      const contentType = options?.contentType || 
                         (file instanceof File ? file.type : 'application/octet-stream');

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: options?.metadata,
      });

      const response = await this.s3Client.send(command);

      return {
        success: true,
        etag: response.ETag,
      };
    } catch (error) {
      console.error('R2 upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete an object from R2
   */
  async deleteObject(key: string): Promise<{ success: boolean; error?: string }> {
    if (!this.s3Client || !this.config) {
      return { success: false, error: 'Client not configured' };
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      return { success: true };
    } catch (error) {
      console.error('R2 delete failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Generate a presigned URL for secure file uploads from browser
   */
  async getPresignedUploadUrl(
    key: string,
    options?: {
      contentType?: string;
      expiresIn?: number; // seconds
    }
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.s3Client || !this.config) {
      return { success: false, error: 'Client not configured' };
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: options?.contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 3600, // 1 hour default
      });

      return { success: true, url };
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate upload URL',
      };
    }
  }

  /**
   * Get the public URL for an object (if bucket allows public access)
   */
  getPublicUrl(key: string): string | null {
    if (!this.config) {
      return null;
    }

    if (this.config.customDomain) {
      return `${this.config.customDomain}/${key}`;
    }

    // Construct public R2 URL (if public access is enabled)
    const baseUrl = this.config.endpoint.replace('.r2.cloudflarestorage.com', '.r2.dev');
    return `${baseUrl}/${key}`;
  }

  /**
   * Check if client is configured and ready to use
   */
  isConfigured(): boolean {
    return !!(this.s3Client && this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): R2Config | null {
    return this.config;
  }
}

// Export a singleton instance for app-wide use
export const r2Client = new R2Client();