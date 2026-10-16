'use client';

import { useState, useEffect } from 'react';

export interface Breakpoints {
  isMobile: boolean;  // < 640px
  isTablet: boolean;  // 640px - 1023px
  isDesktop: boolean; // >= 1024px
  width: number;
}

export function useBreakpoint(): Breakpoints {
  const [state, setState] = useState<Breakpoints>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        width,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}
