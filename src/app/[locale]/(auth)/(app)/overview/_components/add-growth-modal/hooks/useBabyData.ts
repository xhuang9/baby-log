/**
 * Baby Data Hook
 *
 * Fetches baby information and user registration date for percentile calculations.
 * Used by AddGrowthModal to determine age and gender for WHO percentile lookups.
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';
import { useUserStore } from '@/stores/useUserStore';

export function useBabyData(babyId: number) {
  const user = useUserStore(s => s.user);

  // Fetch baby data from local database
  const baby = useLiveQuery(
    async () => {
      return localDb.babies.get(babyId) ?? null;
    },
    [babyId],
  );

  // Fetch user data to get registration date for fallback
  // Only fetch when user is available
  const userCreatedAt = useLiveQuery(
    async () => {
      if (!user?.localId) {
        return null;
      }
      const localUser = await localDb.users.get(user.localId);
      return localUser?.createdAt ?? null;
    },
    [user?.localId],
    null, // initial value
  );

  // Return null for userCreatedAt if it's undefined (still loading)
  // This prevents showing percentiles while data is loading
  const userCreatedAtValue = userCreatedAt === undefined ? null : userCreatedAt;

  return {
    baby: baby ?? null,
    userCreatedAt: userCreatedAtValue,
    isLoading: baby === undefined, // Only consider baby data loading state
  };
}
