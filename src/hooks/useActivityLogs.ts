/**
 * Generic Activity Logs Hook
 *
 * Provides reusable reactive hooks for fetching activity logs from IndexedDB.
 * Used by useFeedLogs, useSleepLogs, and useNappyLogs to reduce duplication.
 */

'use client';

import type { EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Base type for all activity logs - requires common fields
 */
type BaseActivityLog = {
  id: string;
  babyId: number;
  startedAt: Date;
};

/**
 * Get activity logs for a specific baby
 */
export function useActivityLogsForBaby<T extends BaseActivityLog>(
  table: EntityTable<T, 'id'>,
  babyId: number | null | undefined,
  limit?: number,
): T[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      const logs = await table
        .where('babyId')
        .equals(babyId)
        .toArray();

      // Sort descending by startedAt (newest first)
      logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

      if (limit) {
        return logs.slice(0, limit);
      }

      return logs;
    },
    [babyId, limit],
    undefined,
  );
}

/**
 * Get activity logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useActivityLogsByDateRange<T extends BaseActivityLog>(
  table: EntityTable<T, 'id'>,
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): T[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      let logs: T[];

      // If no date range specified (all history), return all logs
      if (startDate === null && endDate === null) {
        logs = await table
          .where('babyId')
          .equals(babyId)
          .toArray();
      } else if (!startDate || !endDate) {
        // If dates are partially provided, return empty
        return [];
      } else {
        // Filter by date range
        logs = await table
          .where('babyId')
          .equals(babyId)
          .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
          .toArray();
      }

      // Sort descending by startedAt (newest first)
      return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    },
    [babyId, startDate?.getTime(), endDate?.getTime()],
    undefined,
  );
}

/**
 * Get the most recent activity log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestActivityLog<T extends BaseActivityLog>(
  table: EntityTable<T, 'id'>,
  babyId: number | null | undefined,
): T | null | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return null;
      }

      const now = new Date();
      const logs = await table
        .where('babyId')
        .equals(babyId)
        .and(log => log.startedAt <= now)
        .toArray();

      if (logs.length === 0) {
        return null;
      }

      // Sort descending by startedAt (newest first) and return the first
      logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      return logs[0] ?? null;
    },
    [babyId],
    undefined,
  );
}

/**
 * Get activity logs count for a baby
 */
export function useActivityLogsCount<T extends BaseActivityLog>(
  table: EntityTable<T, 'id'>,
  babyId: number | null | undefined,
): number | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return 0;
      }

      return table
        .where('babyId')
        .equals(babyId)
        .count();
    },
    [babyId],
    undefined,
  );
}

/**
 * Helper to get today's date range
 */
export function getTodayDateRange(): { today: Date; tomorrow: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return { today, tomorrow };
}
