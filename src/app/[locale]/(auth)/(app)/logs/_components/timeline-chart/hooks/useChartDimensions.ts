'use client';

import { useCallback, useEffect, useState } from 'react';
import { GUTTER_WIDTH, GUTTER_WIDTH_MOBILE } from '../types';

const MD_BREAKPOINT = 768;

export type ChartDimensions = {
  /** Height per hour (calculated to fit all 24 hours in container) */
  hourHeight: number;
  /** Total height for 24 hours */
  totalHeight: number;
  /** Width of the hour label gutter */
  gutterWidth: number;
  /** Whether dimensions have been measured */
  isReady: boolean;
};

/**
 * Hook to calculate chart dimensions that fit 100% of container height
 * All 24 hours will be visible without scrolling
 */
export function useChartDimensions(containerRef: React.RefObject<HTMLDivElement | null>): ChartDimensions {
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    hourHeight: 0,
    totalHeight: 0,
    gutterWidth: GUTTER_WIDTH_MOBILE,
    isReady: false,
  });

  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) {
      return;
    }

    const containerHeight = containerRef.current.clientHeight;
    const isMobile = window.innerWidth < MD_BREAKPOINT;
    const gutterWidth = isMobile ? GUTTER_WIDTH_MOBILE : GUTTER_WIDTH;

    // Calculate hour height to fit all 24 hours
    const hourHeight = Math.floor(containerHeight / 24);
    const totalHeight = hourHeight * 24;

    setDimensions({
      hourHeight,
      totalHeight,
      gutterWidth,
      isReady: true,
    });
  }, [containerRef]);

  useEffect(() => {
    // Initial calculation
    calculateDimensions();

    // Recalculate on resize
    const handleResize = () => {
      calculateDimensions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDimensions]);

  return dimensions;
}
