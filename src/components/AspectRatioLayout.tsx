'use client';

import React, { ReactNode } from 'react';

interface AspectRatioLayoutProps {
  children: ReactNode;
}

/**
 * A component that wraps content in a 7:5 aspect ratio container
 * with optimized layout to prevent unnecessary scrolling
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