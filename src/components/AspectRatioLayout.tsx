'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Grid } from 'antd';

interface AspectRatioLayoutProps {
  children: ReactNode;
}

const { useBreakpoint } = Grid;

/**
 * A component that wraps content in a 7:5 aspect ratio container
 * with optimized layout to prevent unnecessary scrolling and
 * be fully responsive across devices.
 */
const AspectRatioLayout: React.FC<AspectRatioLayoutProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const screens = useBreakpoint();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isMobile = isMounted ? screens.xs : false;
  
  // Using inline styles for mobile to override the className styles when needed
  const containerStyle = isMobile ? {
    padding: 0,
    height: '100vh',
    width: '100vw'
  } : undefined;
  
  const contentStyle = isMobile ? {
    maxWidth: '100%',
    width: '100%',
    height: '100%',
    maxHeight: 'none',
    aspectRatio: 'unset',
    borderRadius: 0,
    boxShadow: 'none'
  } : undefined;
  
  return (
    <div className="aspect-ratio-container" style={containerStyle}>
      <div className="aspect-ratio-content" style={contentStyle}>
        {children}
      </div>
    </div>
  );
};

export default AspectRatioLayout; 