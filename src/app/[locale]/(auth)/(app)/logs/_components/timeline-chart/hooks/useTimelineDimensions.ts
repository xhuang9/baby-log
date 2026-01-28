'use client';

import { useEffect, useState } from 'react';
import {
  GUTTER_WIDTH,
  GUTTER_WIDTH_MOBILE,
  HOUR_HEIGHT,
  HOUR_HEIGHT_MOBILE,
  MIN_BLOCK_HEIGHT,
  TOTAL_HEIGHT,
  TOTAL_HEIGHT_MOBILE,
} from '../types';

const MD_BREAKPOINT = 768;

export type TimelineDimensions = {
  hourHeight: number;
  totalHeight: number;
  gutterWidth: number;
  minBlockHeight: number;
};

function getDimensionsForWidth(width: number): TimelineDimensions {
  if (width >= MD_BREAKPOINT) {
    return {
      hourHeight: HOUR_HEIGHT,
      totalHeight: TOTAL_HEIGHT,
      gutterWidth: GUTTER_WIDTH,
      minBlockHeight: MIN_BLOCK_HEIGHT,
    };
  }
  return {
    hourHeight: HOUR_HEIGHT_MOBILE,
    totalHeight: TOTAL_HEIGHT_MOBILE,
    gutterWidth: GUTTER_WIDTH_MOBILE,
    minBlockHeight: MIN_BLOCK_HEIGHT,
  };
}

/**
 * Hook to get responsive timeline dimensions
 * Returns smaller dimensions on mobile for better fit
 */
export function useTimelineDimensions(): TimelineDimensions {
  const [dimensions, setDimensions] = useState<TimelineDimensions>(() =>
    typeof window !== 'undefined'
      ? getDimensionsForWidth(window.innerWidth)
      : {
          hourHeight: HOUR_HEIGHT_MOBILE, // Default to mobile for SSR
          totalHeight: TOTAL_HEIGHT_MOBILE,
          gutterWidth: GUTTER_WIDTH_MOBILE,
          minBlockHeight: MIN_BLOCK_HEIGHT,
        },
  );

  useEffect(() => {
    const handleResize = () => {
      setDimensions(getDimensionsForWidth(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}
