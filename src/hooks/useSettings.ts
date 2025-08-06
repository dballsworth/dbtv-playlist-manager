import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, R2Config, CloudStorageStatus } from '../types';
import { r2Client } from '../services/r2Client';

const SETTINGS_STORAGE_KEY = 'dbtv-playlist-settings';

// Default settings configuration
const defaultSettings: AppSettings = {
  cloudStorage: {
    r2: {
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucketName: '',
      region: 'auto',
      customDomain: ''
    },
    enabled: false
  },
  ui: {
    theme: 'light',
    compactMode: false,
    showThumbnails: true
  },
  export: {
    defaultFormat: 'json',
    includeMetadata: true,
    compressionLevel: 5
  }
};

// Validation functions
const validateR2Config = (config: R2Config): string[] => {
  const errors: string[] = [];
  
  if (!config.endpoint.trim()) {
    errors.push('Endpoint URL is required');
  } else if (!config.endpoint.startsWith('https://')) {
    errors.push('Endpoint must be a secure HTTPS URL');
  }
  
  if (!config.accessKeyId.trim()) {
    errors.push('Access Key ID is required');
  }
  
  if (!config.secretAccessKey.trim()) {
    errors.push('Secret Access Key is required');
  }
  
  if (!config.bucketName.trim()) {
    errors.push('Bucket name is required');
  } else if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(config.bucketName)) {
    errors.push('Bucket name must be valid (lowercase, no spaces, 3-63 characters)');
  }
  
  return errors;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [cloudStatus, setCloudStatus] = useState<CloudStorageStatus>({
    status: 'disconnected'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Merge with defaults to handle new settings fields
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: AppSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      throw new Error('Failed to save settings');
    }
  }, []);

  // Update R2 configuration
  const updateR2Config = useCallback((config: Partial<R2Config>) => {
    const newSettings = {
      ...settings,
      cloudStorage: {
        ...settings.cloudStorage,
        r2: { ...settings.cloudStorage.r2, ...config }
      }
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Enable/disable cloud storage
  const setCloudStorageEnabled = useCallback((enabled: boolean) => {
    const newSettings = {
      ...settings,
      cloudStorage: { ...settings.cloudStorage, enabled }
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Validate current R2 configuration
  const validateR2Settings = useCallback(() => {
    return validateR2Config(settings.cloudStorage.r2);
  }, [settings.cloudStorage.r2]);

  // Test connection with real R2 client
  const testConnection = useCallback(async (): Promise<boolean> => {
    const errors = validateR2Settings();
    if (errors.length > 0) {
      setCloudStatus({
        status: 'error',
        error: errors[0],
        lastTested: new Date()
      });
      return false;
    }

    setCloudStatus({ status: 'connecting' });
    
    try {
      // Configure R2 client with current settings
      r2Client.configure(settings.cloudStorage.r2);
      
      // Test actual connection to R2
      const result = await r2Client.testConnection();
      
      if (result.success) {
        setCloudStatus({
          status: 'connected',
          lastTested: new Date()
        });
        return true;
      } else {
        setCloudStatus({
          status: 'error',
          error: result.error || 'Connection failed',
          lastTested: new Date()
        });
        return false;
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setCloudStatus({
        status: 'error',
        error: 'Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        lastTested: new Date()
      });
      return false;
    }
  }, [settings.cloudStorage.r2, validateR2Settings]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    saveSettings(defaultSettings);
    setCloudStatus({ status: 'disconnected' });
  }, [saveSettings]);

  // Clear sensitive data
  const clearCredentials = useCallback(() => {
    const clearedSettings = {
      ...settings,
      cloudStorage: {
        ...settings.cloudStorage,
        r2: {
          ...settings.cloudStorage.r2,
          accessKeyId: '',
          secretAccessKey: ''
        },
        enabled: false
      }
    };
    saveSettings(clearedSettings);
    setCloudStatus({ status: 'disconnected' });
  }, [settings, saveSettings]);

  return {
    // State
    settings,
    cloudStatus,
    isLoading,
    
    // R2 specific functions
    updateR2Config,
    setCloudStorageEnabled,
    validateR2Settings,
    testConnection,
    
    // General settings functions
    saveSettings,
    resetSettings,
    clearCredentials,
    
    // Computed values
    isR2Configured: Boolean(
      settings.cloudStorage.r2.endpoint &&
      settings.cloudStorage.r2.accessKeyId &&
      settings.cloudStorage.r2.secretAccessKey &&
      settings.cloudStorage.r2.bucketName
    ),
    isR2Valid: validateR2Settings().length === 0
  };
};