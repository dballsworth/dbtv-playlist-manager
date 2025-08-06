import React from 'react';
import { PackageBuilder } from './package-builder/PackageBuilder';

export const PackagesView: React.FC = () => {
  return (
    <div className="packages-view">
      <PackageBuilder />
    </div>
  );
};