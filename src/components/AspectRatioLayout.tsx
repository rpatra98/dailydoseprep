'use client';

import React, { ReactNode } from 'react';

interface AspectRatioLayoutProps {
  children: ReactNode;
}

const AspectRatioLayout: React.FC<AspectRatioLayoutProps> = ({ children }) => {
  return (
    <div className="aspect-ratio-container">
      <div className="aspect-ratio-content">
        {children}
      </div>
    </div>
  );
};

export default AspectRatioLayout; 