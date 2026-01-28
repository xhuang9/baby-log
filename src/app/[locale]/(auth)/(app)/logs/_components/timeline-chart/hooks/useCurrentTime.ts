'use client';

import { useEffect, useState } from 'react';
import { HOUR_HEIGHT } from '../types';

/**
 * Calculate top position for current time
 */
function getCurrentTimePosition(): number {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  return hours * HOUR_HEIGHT;
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  );
}

export type UseCurrentTimeResult = {
  /** Top position in pixels */
  position: number;
  /** Current date-time */
  now: Date;
  /** Check if a given date is today */
  isToday: (date: Date) => boolean;
};

/**
 * Hook to track current time position, updates every minute
 */
export function useCurrentTime(): UseCurrentTimeResult {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Calculate ms until next minute
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000;

    // Set timeout for first update at the next minute
    const initialTimeout = setTimeout(() => {
      setNow(new Date());

      // Then update every minute
      const interval = setInterval(() => {
        setNow(new Date());
      }, 60000);

      // Store interval for cleanup
      (window as unknown as { __currentTimeInterval?: NodeJS.Timeout }).__currentTimeInterval = interval;
    }, msUntilNextMinute);

    return () => {
      clearTimeout(initialTimeout);
      const interval = (window as unknown as { __currentTimeInterval?: NodeJS.Timeout }).__currentTimeInterval;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return {
    position: getCurrentTimePosition(),
    now,
    isToday,
  };
}
