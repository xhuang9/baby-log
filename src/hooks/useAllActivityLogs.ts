'use client';

import type { ActivityType } from './useLogsFilters';
import type { UnifiedLog } from '@/lib/format-log';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';
import { useBathLogsByDateRange } from './useBathLogs';
import { useFeedLogsByDateRange } from './useFeedLogs';
import { useGrowthLogsByDateRange } from './useGrowthLogs';
import { useMedicationLogsByDateRange } from './useMedicationLogs';
import { useNappyLogsByDateRange } from './useNappyLogs';
import { usePumpingLogsByDateRange } from './usePumpingLogs';
import { useSleepLogsByDateRange } from './useSleepLogs';
import { useSolidsLogsByDateRange } from './useSolidsLogs';

/**
 * Fetch all activity logs (feed + sleep + nappy) for a baby within a date range
 * Returns unified logs sorted DESC by startedAt with caregiver labels
 *
 * Usage:
 * ```
 * const { activeTypes, startDate, endDate } = useLogsFilters();
 * const logs = useAllActivityLogs(babyId, activeTypes, startDate, endDate);
 * ```
 */
export function useAllActivityLogs(
  babyId: number | null | undefined,
  activeTypes: ActivityType[],
  startDate: Date | null,
  endDate: Date | null,
): UnifiedLog[] | undefined {
  // Query each activity type conditionally
  const feeds = useFeedLogsByDateRange(
    activeTypes.includes('feed') ? babyId : null,
    startDate,
    endDate,
  );

  const sleeps = useSleepLogsByDateRange(
    activeTypes.includes('sleep') ? babyId : null,
    startDate,
    endDate,
  );

  const nappies = useNappyLogsByDateRange(
    activeTypes.includes('nappy') ? babyId : null,
    startDate,
    endDate,
  );

  const solids = useSolidsLogsByDateRange(
    activeTypes.includes('solids') ? babyId : null,
    startDate,
    endDate,
  );

  const pumps = usePumpingLogsByDateRange(
    activeTypes.includes('pumping') ? babyId : null,
    startDate,
    endDate,
  );

  const growths = useGrowthLogsByDateRange(
    activeTypes.includes('growth') ? babyId : null,
    startDate,
    endDate,
  );

  const baths = useBathLogsByDateRange(
    activeTypes.includes('bath') ? babyId : null,
    startDate,
    endDate,
  );

  const medications = useMedicationLogsByDateRange(
    activeTypes.includes('medication') ? babyId : null,
    startDate,
    endDate,
  );

  // Merge and enrich with caregiver data
  const allLogs = useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      // If any feed/sleep/nappy/solids/pumping/growth/bath/medication queries are loading (undefined), return undefined
      if (
        (activeTypes.includes('feed') && feeds === undefined)
        || (activeTypes.includes('sleep') && sleeps === undefined)
        || (activeTypes.includes('nappy') && nappies === undefined)
        || (activeTypes.includes('solids') && solids === undefined)
        || (activeTypes.includes('pumping') && pumps === undefined)
        || (activeTypes.includes('growth') && growths === undefined)
        || (activeTypes.includes('bath') && baths === undefined)
        || (activeTypes.includes('medication') && medications === undefined)
      ) {
        return undefined;
      }

      // Collect all unique userIds to batch query babyAccess
      const userIds = new Set<number>();
      if (feeds) {
        for (const feed of feeds) {
          userIds.add(feed.loggedByUserId);
        }
      }
      if (sleeps) {
        for (const sleep of sleeps) {
          userIds.add(sleep.loggedByUserId);
        }
      }
      if (nappies) {
        for (const nappy of nappies) {
          userIds.add(nappy.loggedByUserId);
        }
      }
      if (solids) {
        for (const solid of solids) {
          userIds.add(solid.loggedByUserId);
        }
      }
      if (pumps) {
        for (const pump of pumps) {
          userIds.add(pump.loggedByUserId);
        }
      }
      if (growths) {
        for (const growth of growths) {
          userIds.add(growth.loggedByUserId);
        }
      }
      if (baths) {
        for (const bath of baths) {
          userIds.add(bath.loggedByUserId);
        }
      }
      if (medications) {
        for (const medication of medications) {
          userIds.add(medication.loggedByUserId);
        }
      }

      // Batch query all babyAccess records for this baby
      const accessRecords = await localDb.babyAccess
        .where('babyId')
        .equals(babyId)
        .toArray();

      // Create lookup map: userId -> caregiverLabel
      const accessMap = new Map<number, string | null>();
      for (const access of accessRecords) {
        if (userIds.has(access.userId)) {
          accessMap.set(access.userId, access.caregiverLabel ?? null);
        }
      }

      const unified: UnifiedLog[] = [];

      // Transform feeds
      if (feeds) {
        for (const feed of feeds) {
          unified.push({
            id: feed.id,
            type: 'feed',
            babyId: feed.babyId,
            startedAt: feed.startedAt,
            caregiverLabel: accessMap.get(feed.loggedByUserId) ?? null,
            data: feed,
          });
        }
      }

      // Transform sleeps
      if (sleeps) {
        for (const sleep of sleeps) {
          unified.push({
            id: sleep.id,
            type: 'sleep',
            babyId: sleep.babyId,
            startedAt: sleep.startedAt,
            caregiverLabel: accessMap.get(sleep.loggedByUserId) ?? null,
            data: sleep,
          });
        }
      }

      // Transform nappies
      if (nappies) {
        for (const nappy of nappies) {
          unified.push({
            id: nappy.id,
            type: 'nappy',
            babyId: nappy.babyId,
            startedAt: nappy.startedAt,
            caregiverLabel: accessMap.get(nappy.loggedByUserId) ?? null,
            data: nappy,
          });
        }
      }

      // Transform solids
      if (solids) {
        for (const solid of solids) {
          unified.push({
            id: solid.id,
            type: 'solids',
            babyId: solid.babyId,
            startedAt: solid.startedAt,
            caregiverLabel: accessMap.get(solid.loggedByUserId) ?? null,
            data: solid,
          });
        }
      }

      // Transform pumping logs
      if (pumps) {
        for (const pump of pumps) {
          unified.push({
            id: pump.id,
            type: 'pumping',
            babyId: pump.babyId,
            startedAt: pump.startedAt,
            caregiverLabel: accessMap.get(pump.loggedByUserId) ?? null,
            data: pump,
          });
        }
      }

      // Transform growth logs
      if (growths) {
        for (const growth of growths) {
          unified.push({
            id: growth.id,
            type: 'growth',
            babyId: growth.babyId,
            startedAt: growth.startedAt,
            caregiverLabel: accessMap.get(growth.loggedByUserId) ?? null,
            data: growth,
          });
        }
      }

      // Transform bath logs
      if (baths) {
        for (const bath of baths) {
          unified.push({
            id: bath.id,
            type: 'bath',
            babyId: bath.babyId,
            startedAt: bath.startedAt,
            caregiverLabel: accessMap.get(bath.loggedByUserId) ?? null,
            data: bath,
          });
        }
      }

      // Transform medication logs
      if (medications) {
        for (const medication of medications) {
          unified.push({
            id: medication.id,
            type: 'medication',
            babyId: medication.babyId,
            startedAt: medication.startedAt,
            caregiverLabel: accessMap.get(medication.loggedByUserId) ?? null,
            data: medication,
          });
        }
      }

      // Sort DESC by startedAt (newest first)
      return unified.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    },
    [babyId, feeds, sleeps, nappies, solids, pumps, growths, baths, medications, activeTypes.join(',')],
    undefined,
  );

  return allLogs;
}
