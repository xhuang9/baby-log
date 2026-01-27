'use client';

import { useCallback, useMemo, useState } from 'react';

export type UseDateNavigationOptions = {
  /** Number of days to show at once */
  visibleDays?: number;
  /** Initial number of days to pre-load before today */
  preloadDays?: number;
};

export type UseDateNavigationResult = {
  /** Currently visible dates (7 or configured amount) */
  visibleDates: Date[];
  /** Start of the loaded date range */
  rangeStart: Date;
  /** End of the loaded date range */
  rangeEnd: Date;
  /** Whether there are earlier dates that could be loaded */
  canLoadEarlier: boolean;
  /** Navigate to earlier dates */
  goEarlier: () => void;
  /** Navigate to later dates */
  goLater: () => void;
  /** Jump to a specific date */
  goToDate: (date: Date) => void;
  /** Reset to today */
  goToToday: () => void;
};

/**
 * Manage date navigation for week view
 * Tracks visible date range and supports navigation
 */
export function useDateNavigation({
  visibleDays = 7,
  preloadDays = 30,
}: UseDateNavigationOptions = {}): UseDateNavigationResult {
  // Track the end date of the visible range (defaults to today)
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Calculate visible dates (ending with endDate)
  const visibleDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = visibleDays - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  }, [endDate, visibleDays]);

  // Calculate loaded range (with preload buffer)
  const rangeStart = useMemo(() => {
    const start = new Date(endDate);
    start.setDate(start.getDate() - preloadDays);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [endDate, preloadDays]);

  const rangeEnd = useMemo(() => {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [endDate]);

  // Check if we can navigate earlier (arbitrary limit of 365 days)
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const canLoadEarlier = useMemo(() => {
    const daysDiff = Math.floor(
      (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysDiff < 365 - visibleDays;
  }, [today, endDate, visibleDays]);

  const goEarlier = useCallback(() => {
    setEndDate((prev) => {
      const newEnd = new Date(prev);
      newEnd.setDate(newEnd.getDate() - visibleDays);
      return newEnd;
    });
  }, [visibleDays]);

  const goLater = useCallback(() => {
    setEndDate((prev) => {
      const newEnd = new Date(prev);
      newEnd.setDate(newEnd.getDate() + visibleDays);
      // Don't go past today
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      if (newEnd > todayMidnight) {
        return todayMidnight;
      }
      return newEnd;
    });
  }, [visibleDays]);

  const goToDate = useCallback((date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setEndDate(normalized);
  }, []);

  const goToToday = useCallback(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    setEndDate(todayMidnight);
  }, []);

  return {
    visibleDates,
    rangeStart,
    rangeEnd,
    canLoadEarlier,
    goEarlier,
    goLater,
    goToDate,
    goToToday,
  };
}
