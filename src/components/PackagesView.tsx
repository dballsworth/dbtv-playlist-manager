import React from 'react';
import { PackageBuilder } from './package-builder/PackageBuilder';
import { PackageList } from './packages/PackageList';
import { r2Client } from '../services/r2Client';

export const PackagesView: React.FC = () => {
  const isR2Configured = r2Client.isConfigured();

  return (
    <div className="packages-view">
      <div className="packages-layout">
        {/* Left Panel - Package Builder */}
        <div className="package-builder-panel">
          <PackageBuilder />
        </div>
        
        {/* Right Panel - Package List */}
        {isR2Configured && (
          <div className="package-list-panel">
            <PackageList />
          </div>
        )}
      </div>
    </div>
  );
};