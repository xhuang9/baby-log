'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type TimeRange = 'today' | 'yesterday' | 'twoDaysAgo' | 'past7days' | 'past30days' | 'past90days' | 'all';

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'All history' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'twoDaysAgo', label: '2 days ago' },
  { value: 'past7days', label: 'Past 7 days' },
  { value: 'past30days', label: 'Past 30 days' },
  { value: 'past90days', label: 'Past 90 days' },
];

export type ActivityType = 'feed' | 'sleep' | 'nappy';

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'nappy', label: 'Nappy' },
];

export type UseLogsFiltersResult = {
  activeTypes: ActivityType[];
  timeRange: TimeRange;
  startDate: Date | null;
  endDate: Date | null;
  setActiveTypes: (types: ActivityType[]) => void;
  setTimeRange: (range: TimeRange) => void;
};

/**
 * Manage logs filter state with URL sync
 * Parses filters from search params and updates URL when filters change
 */
export function useLogsFilters(): UseLogsFiltersResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse active types from URL (default: all)
  const activeTypes = useMemo(() => {
    const types = searchParams.get('types');
    if (!types) {
      return ['feed', 'sleep', 'nappy'] as ActivityType[];
    }

    return types
      .split(',')
      .filter((t): t is ActivityType => t === 'feed' || t === 'sleep' || t === 'nappy');
  }, [searchParams]);

  // Parse time range from URL (default: all)
  const timeRange = useMemo(() => {
    const range = searchParams.get('range') as TimeRange | null;
    const validRanges: TimeRange[] = [
      'today',
      'yesterday',
      'twoDaysAgo',
      'past7days',
      'past30days',
      'past90days',
      'all',
    ];
    return range && validRanges.includes(range) ? range : 'all';
  }, [searchParams]);

  // Calculate start and end dates based on time range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (timeRange) {
      case 'all':
        return { startDate: null, endDate: null };

      case 'today':
        return { startDate: start, endDate: end };

      case 'yesterday': {
        start.setDate(start.getDate() - 1);
        const yesterdayEnd = new Date(start);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: yesterdayEnd };
      }

      case 'twoDaysAgo': {
        start.setDate(start.getDate() - 2);
        const twoDaysEnd = new Date(start);
        twoDaysEnd.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: twoDaysEnd };
      }

      case 'past7days':
        start.setDate(start.getDate() - 7);
        return { startDate: start, endDate: end };

      case 'past30days':
        start.setDate(start.getDate() - 30);
        return { startDate: start, endDate: end };

      case 'past90days':
        start.setDate(start.getDate() - 90);
        return { startDate: start, endDate: end };

      default:
        return { startDate: null, endDate: null };
    }
  }, [timeRange]);

  // Update URL when types change
  const setActiveTypes = useCallback(
    (types: ActivityType[]) => {
      const params = new URLSearchParams(searchParams);
      if (types.length === 0 || (types.includes('feed') && types.includes('sleep') && types.includes('nappy'))) {
        // If no types selected or all types selected, remove the param
        params.delete('types');
      } else {
        params.set('types', types.join(','));
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  // Update URL when time range changes
  const setTimeRange = useCallback(
    (range: TimeRange) => {
      const params = new URLSearchParams(searchParams);
      if (range === 'all') {
        // If default, remove the param
        params.delete('range');
      } else {
        params.set('range', range);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  return {
    activeTypes,
    timeRange,
    startDate,
    endDate,
    setActiveTypes,
    setTimeRange,
  };
}
