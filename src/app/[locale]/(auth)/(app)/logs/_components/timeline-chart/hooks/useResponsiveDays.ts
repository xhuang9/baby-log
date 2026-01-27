'use client';

import { useEffect, useState } from 'react';

/**
 * Breakpoint configuration for visible days
 * - < 768px (mobile): 7 days
 * - md (768px+): 10 days
 * - lg (1024px+): 10 days (sidebar visible, less body width)
 * - xl (1280px+): 14 days
 */
const BREAKPOINTS = {
  xl: { minWidth: 1280, days: 14 },
  lg: { minWidth: 1024, days: 10 },
  md: { minWidth: 768, days: 10 },
  base: { minWidth: 0, days: 7 },
} as const;

function getDaysForWidth(width: number): number {
  if (width >= BREAKPOINTS.xl.minWidth) {
    return BREAKPOINTS.xl.days;
  }
  if (width >= BREAKPOINTS.lg.minWidth) {
    return BREAKPOINTS.lg.days;
  }
  if (width >= BREAKPOINTS.md.minWidth) {
    return BREAKPOINTS.md.days;
  }
  return BREAKPOINTS.base.days;
}

/**
 * Hook to get responsive number of days for week view
 * Returns different day counts based on viewport width
 */
export function useResponsiveDays(): number {
  const [days, setDays] = useState<number>(BREAKPOINTS.base.days);

  useEffect(() => {
    // Set initial value
    setDays(getDaysForWidth(window.innerWidth));

    const handleResize = () => {
      setDays(getDaysForWidth(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return days;
}
