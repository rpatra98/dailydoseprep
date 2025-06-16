'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Grid } from 'antd';

interface AspectRatioLayoutProps {
  children: ReactNode;
}

const { useBreakpoint } = Grid;

/**
 * A component that wraps content in a 7:5 aspect ratio container for desktop
 * and provides full responsive layout for mobile/tablet devices.
 * 
 * Desktop (1024px+): 7:5 aspect ratio with rounded corners and shadow
 * Tablet (768-1023px): Slightly padded full screen
 * Mobile (<767px): Full screen without padding
 */
const AspectRatioLayout: React.FC<AspectRatioLayoutProps> = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const screens = useBreakpoint();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="aspect-ratio-container">
        <div className="aspect-ratio-content">
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <div className="aspect-ratio-container">
      <div className="aspect-ratio-content">
        {children}
      </div>
    </div>
  );
};

export default AspectRatioLayout; 