'use client';

import type { TimelineBlock, TimelineDay } from '../types';
import type { UnifiedLog } from '@/lib/format-log';
import type { LocalFeedLog, LocalSleepLog } from '@/lib/local-db';
import { useMemo } from 'react';
import {
  HOUR_OFFSET,
  MIN_BLOCK_HEIGHT,

} from '../types';

/**
 * Format date as YYYY-MM-DD key
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get minutes from 6am for chart positioning
 * Times before 6am are treated as later in the day (wrap around)
 */
function getMinutesFrom6AM(date: Date): number {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const offsetMinutes = HOUR_OFFSET * 60; // 6 hours = 360 minutes
  const adjusted = totalMinutes - offsetMinutes;
  // Wrap negative values (times before 6am) to the end of the 24-hour period
  return adjusted < 0 ? adjusted + 1440 : adjusted;
}

/**
 * Calculate block position and height
 */
function calculateBlockPosition(startMinutes: number, durationMinutes: number, hourHeight: number) {
  const top = (startMinutes / 60) * hourHeight;
  const height = Math.max((durationMinutes / 60) * hourHeight, MIN_BLOCK_HEIGHT);
  return { top, height };
}

/**
 * Get duration from log, handling both feed and sleep logs
 */
function getLogDuration(log: UnifiedLog): number {
  const data = log.data as LocalFeedLog | LocalSleepLog;

  // If durationMinutes is set, use it
  if (data.durationMinutes && data.durationMinutes > 0) {
    return data.durationMinutes;
  }

  // Otherwise calculate from endedAt - startedAt
  if (data.endedAt) {
    const diff = data.endedAt.getTime() - data.startedAt.getTime();
    return Math.round(diff / (1000 * 60));
  }

  // For ongoing activities or instant events, use a small duration for visibility
  return 15; // Default 15-minute span for instant events (nappy, etc.)
}

/**
 * Transform unified logs into positioned timeline blocks grouped by day
 */
export function useTimelineData(
  logs: UnifiedLog[] | undefined,
  dateRange?: { start: Date; end: Date },
  hourHeight: number = 60,
): TimelineDay[] {
  return useMemo(() => {
    if (!logs || logs.length === 0) {
      return [];
    }

    // Group logs by date
    const dayMap = new Map<string, { date: Date; blocks: TimelineBlock[] }>();

    for (const log of logs) {
      // Filter by date range if provided
      if (dateRange) {
        const logDate = log.startedAt;
        if (logDate < dateRange.start || logDate > dateRange.end) {
          continue;
        }
      }

      const dateKey = formatDateKey(log.startedAt);
      const startMinutes = getMinutesFrom6AM(log.startedAt);
      const durationMinutes = getLogDuration(log);
      const { top, height } = calculateBlockPosition(startMinutes, durationMinutes, hourHeight);

      const block: TimelineBlock = {
        log,
        dateKey,
        startMinutes,
        durationMinutes,
        top,
        height,
      };

      if (!dayMap.has(dateKey)) {
        const date = new Date(log.startedAt);
        date.setHours(0, 0, 0, 0);
        dayMap.set(dateKey, { date, blocks: [] });
      }

      dayMap.get(dateKey)!.blocks.push(block);
    }

    // Convert to array and sort by date (newest first)
    const days: TimelineDay[] = Array.from(dayMap.entries()).map(
      ([dateKey, { date, blocks }]) => ({
        date,
        dateKey,
        // Sort blocks by start time (earliest first)
        blocks: blocks.sort((a, b) => a.startMinutes - b.startMinutes),
      }),
    );

    // Sort days by date (newest first for natural display)
    days.sort((a, b) => b.date.getTime() - a.date.getTime());

    return days;
  }, [logs, dateRange, hourHeight]);
}

/**
 * Get timeline data for a single day (today view)
 */
export function useTimelineDataForDay(
  logs: UnifiedLog[] | undefined,
  targetDate: Date,
  hourHeight: number = 60,
): TimelineDay | null {
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  const days = useTimelineData(logs, { start, end }, hourHeight);
  return days[0] ?? null;
}
