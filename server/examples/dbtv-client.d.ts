/**
 * TypeScript definitions for DBTV API Client SDK
 */

export interface Package {
  id: string;
  filename: string;
  packageName: string;
  size: number;
  lastModified: string;
  downloadUrl: string;
  playlistCount?: number;
  playlistNames?: string[];
  videoCount?: number;
}

export interface SearchOptions {
  query?: string;
  minPlaylists?: number;
  maxPlaylists?: number;
  minVideos?: number;
  maxVideos?: number;
}

export interface ClientOptions {
  timeout?: number;
  retryAttempts?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
  apiKey?: string;
}

export interface HealthResponse {
  status: 'healthy';
  timestamp: string;
}

export interface PackageStatistics {
  totalPackages: number;
  totalPlaylists: number;
  totalVideos: number;
  totalSize: number;
  averagePackageSize: number;
  latestPackage: Package | null;
}

export interface VideoReference {
  filename: string;
  title: string;
  description?: string;
  duration?: number;
  tags?: string[];
}

export interface PlaylistDefinition {
  name: string;
  description?: string;
  videos: VideoReference[];
}

export interface ExtractedPackageContents {
  playlists: Record<string, PlaylistDefinition>;
  videos: Record<string, { path: string; size: number }>;
  metadata: any | null;
}

export interface RequestInterceptor {
  (requestOptions: RequestInit): Promise<RequestInit> | RequestInit;
}

export interface ResponseInterceptor {
  (data: any, response: Response): Promise<any> | any;
}

export declare class DBTVApiError extends Error {
  readonly name: 'DBTVApiError';
  readonly status?: number;
  readonly response?: any;
  
  constructor(message: string, status?: number, response?: any);
}

export declare class PackageNotFoundError extends DBTVApiError {
  readonly name: 'PackageNotFoundError';
  readonly packageId: string;
  
  constructor(packageId: string);
}

export declare class RateLimitError extends DBTVApiError {
  readonly name: 'RateLimitError';
  readonly retryAfter: number;
  
  constructor(retryAfter: number);
}

export declare class DBTVClient {
  readonly baseUrl: string;
  readonly options: ClientOptions;
  
  constructor(baseUrl: string, options?: ClientOptions);
  
  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;
  clearCache(): void;
  
  health(): Promise<HealthResponse>;
  getPackages(includeMetadata?: boolean): Promise<Package[]>;
  getPackage(packageId: string): Promise<Package>;
  searchPackages(searchOptions?: SearchOptions): Promise<Package[]>;
  downloadPackage(packageId: string, onProgress?: (received: number, total: number) => void): Promise<Blob>;
  downloadAndExtractPackage(packageId: string, onProgress?: (received: number, total: number) => void): Promise<ExtractedPackageContents>;
  getStatistics(): Promise<PackageStatistics>;
  
  batch<T, R>(
    items: T[], 
    operation: (item: T) => Promise<R>, 
    batchSize?: number
  ): Promise<(R | null)[]>;
}

export declare namespace DBTVUtils {
  function formatFileSize(bytes: number): string;
  function formatDuration(ms: number): string;
  function isValidPackageId(packageId: string): boolean;
  function extractPackageName(filename: string): string;
}

export { DBTVClient as default };