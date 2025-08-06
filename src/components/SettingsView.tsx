import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Eye, EyeOff, Check, X, Loader, AlertCircle, Cloud, CloudOff } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    cloudStatus,
    isLoading,
    updateR2Config,
    setCloudStorageEnabled,
    validateR2Settings,
    testConnection,
    clearCredentials,
    isR2Configured,
    isR2Valid
  } = useSettings();

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Handle input changes
  const handleR2ConfigChange = (field: keyof typeof settings.cloudStorage.r2, value: string) => {
    updateR2Config({ [field]: value });
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  // Handle enable/disable toggle
  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && !isR2Valid) {
      const errors = validateR2Settings();
      setValidationErrors(errors);
      return;
    }
    setCloudStorageEnabled(enabled);
  };

  // Handle connection test
  const handleTestConnection = async () => {
    setIsTesting(true);
    setValidationErrors([]);
    
    try {
      const success = await testConnection();
      if (!success && cloudStatus.error) {
        setValidationErrors([cloudStatus.error]);
      }
    } catch {
      setValidationErrors(['Connection test failed']);
    } finally {
      setIsTesting(false);
    }
  };

  // Handle clear credentials
  const handleClearCredentials = () => {
    if (confirm('Are you sure you want to clear all cloud storage credentials? This action cannot be undone.')) {
      clearCredentials();
      setValidationErrors([]);
    }
  };

  const getStatusIcon = () => {
    switch (cloudStatus.status) {
      case 'connected': return <Check className="status-icon connected" size={16} />;
      case 'connecting': return <Loader className="status-icon connecting" size={16} />;
      case 'error': return <X className="status-icon error" size={16} />;
      default: return <CloudOff className="status-icon disconnected" size={16} />;
    }
  };

  const getStatusText = () => {
    switch (cloudStatus.status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Testing...';
      case 'error': return 'Connection Failed';
      default: return 'Not Connected';
    }
  };

  if (isLoading) {
    return (
      <div className="settings-view">
        <div className="loading-spinner">
          <Loader size={24} />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-view">
      <h2>Settings</h2>
      
      <div className="settings-panel">
        <div className="settings-section">
          <div className="section-header">
            <h3>
              <Cloud size={20} />
              Cloudflare R2 Storage
            </h3>
            <div className="connection-status">
              {getStatusIcon()}
              <span className={`status-text ${cloudStatus.status}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
          
          <p className="section-description">
            Configure your Cloudflare R2 bucket for video storage and streaming.
          </p>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <AlertCircle size={16} />
              <div>
                {validationErrors.map((error, index) => (
                  <div key={index} className="error-message">{error}</div>
                ))}
              </div>
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.cloudStorage.enabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              Enable Cloud Storage
            </label>
          </div>

          {/* R2 Configuration Form */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="r2-endpoint">Endpoint URL</label>
              <input
                id="r2-endpoint"
                type="url"
                value={settings.cloudStorage.r2.endpoint}
                onChange={(e) => handleR2ConfigChange('endpoint', e.target.value)}
                placeholder="https://your-account-id.r2.cloudflarestorage.com"
                className="form-input"
              />
              <small className="form-hint">
                Your Cloudflare R2 endpoint URL
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="r2-bucket">Bucket Name</label>
              <input
                id="r2-bucket"
                type="text"
                value={settings.cloudStorage.r2.bucketName}
                onChange={(e) => handleR2ConfigChange('bucketName', e.target.value)}
                placeholder="my-video-bucket"
                className="form-input"
              />
              <small className="form-hint">
                The name of your R2 bucket
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="r2-access-key">Access Key ID</label>
              <input
                id="r2-access-key"
                type="text"
                value={settings.cloudStorage.r2.accessKeyId}
                onChange={(e) => handleR2ConfigChange('accessKeyId', e.target.value)}
                placeholder="Enter your access key ID"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="r2-secret-key">Secret Access Key</label>
              <div className="password-input-group">
                <input
                  id="r2-secret-key"
                  type={showSecretKey ? 'text' : 'password'}
                  value={settings.cloudStorage.r2.secretAccessKey}
                  onChange={(e) => handleR2ConfigChange('secretAccessKey', e.target.value)}
                  placeholder="Enter your secret access key"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="password-toggle"
                  title={showSecretKey ? 'Hide key' : 'Show key'}
                >
                  {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="r2-region">Region (Optional)</label>
              <input
                id="r2-region"
                type="text"
                value={settings.cloudStorage.r2.region || ''}
                onChange={(e) => handleR2ConfigChange('region', e.target.value)}
                placeholder="auto"
                className="form-input"
              />
              <small className="form-hint">
                Leave as 'auto' unless you have specific requirements
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="r2-custom-domain">Custom Domain (Optional)</label>
              <input
                id="r2-custom-domain"
                type="url"
                value={settings.cloudStorage.r2.customDomain || ''}
                onChange={(e) => handleR2ConfigChange('customDomain', e.target.value)}
                placeholder="https://videos.yourdomain.com"
                className="form-input"
              />
              <small className="form-hint">
                Custom domain for serving videos
              </small>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              onClick={handleTestConnection}
              disabled={!isR2Configured || isTesting}
              className="btn btn-primary"
            >
              {isTesting ? (
                <>
                  <Loader size={16} />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            <button
              onClick={handleClearCredentials}
              disabled={!isR2Configured}
              className="btn btn-secondary"
            >
              Clear Credentials
            </button>
          </div>

          {/* Connection Status Details */}
          {cloudStatus.lastTested && (
            <div className="status-details">
              <small>
                Last tested: {cloudStatus.lastTested.toLocaleString()}
              </small>
            </div>
          )}
        </div>

        {/* Other Settings Sections */}
        <div className="settings-section">
          <h3>Export Settings</h3>
          <p>Customize export format and compression settings for content packages.</p>
          <small className="coming-soon">Coming soon...</small>
        </div>
        
        <div className="settings-section">
          <h3>Performance</h3>
          <p>Adjust application performance settings and caching options.</p>
          <small className="coming-soon">Coming soon...</small>
        </div>
      </div>
    </div>
  );
};