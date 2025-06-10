'use client';

import React, { ReactNode } from 'react';

interface AspectRatioLayoutProps {
  children: ReactNode;
}

/**
 * A component that wraps content in a 3:2 aspect ratio container
 */
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