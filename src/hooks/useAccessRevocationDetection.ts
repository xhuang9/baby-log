/**
 * Access Revocation Detection Hook
 *
 * Monitors the outbox for "Access denied" errors and checks if user's access
 * to a baby has been revoked. If so, clears local data and shows warning.
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyBabyAccess } from '@/actions/baby';
import { localDb } from '@/lib/local-db/database';
import { clearRevokedBabyData } from '@/lib/local-db/helpers/access-revoked';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';
import { getI18nPath } from '@/utils/Helpers';

type RevokedBabyInfo = {
  babyId: number;
  babyName: string;
  reason: 'no_access' | 'baby_not_found';
};

export function useAccessRevocationDetection(locale: string = 'en') {
  const router = useRouter();
  const [revokedBaby, setRevokedBaby] = useState<RevokedBabyInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkedBabies = useRef<Set<number>>(new Set());

  const user = useUserStore(s => s.user);
  const activeBaby = useBabyStore(s => s.activeBaby);
  const clearActiveBaby = useBabyStore(s => s.clearActiveBaby);
  const setAllBabies = useBabyStore(s => s.setAllBabies);
  const allBabies = useBabyStore(s => s.allBabies);

  // Monitor failed mutations with "Access denied"
  const failedMutations = useLiveQuery(async () => {
    const failed = await localDb.outbox
      .where('status')
      .equals('failed')
      .filter(m => m.errorMessage?.includes('Access denied') ?? false)
      .toArray();

    return failed;
  }, []);

  // Check if a baby's access has been revoked
  const checkBabyAccess = useCallback(async (babyId: number) => {
    if (checkedBabies.current.has(babyId) || isChecking || !user) {
      return;
    }

    console.log(`[Access Revocation] Checking access for baby ${babyId}`);
    setIsChecking(true);
    checkedBabies.current.add(babyId);

    try {
      const result = await verifyBabyAccess(babyId);

      if (!result.success) {
        console.error('[Access Revocation] Failed to verify access:', result.error);
        return;
      }

      if (!result.hasAccess) {
        console.warn(`[Access Revocation] Access revoked for baby ${babyId}`, result.reason);

        // Get baby name from local DB
        const baby = await localDb.babies.get(babyId);
        const babyName = baby?.name ?? `Baby #${babyId}`;

        // Clear local data for this baby
        await clearRevokedBabyData(babyId, user.localId);

        // Update stores
        const remainingBabies = allBabies.filter(b => b.babyId !== babyId);
        setAllBabies(remainingBabies);

        // If this was the active baby, clear it
        if (activeBaby?.babyId === babyId) {
          clearActiveBaby();
        }

        // Show revocation modal
        setRevokedBaby({
          babyId,
          babyName,
          reason: result.reason,
        });
      } else {
        console.log(`[Access Revocation] Access confirmed for baby ${babyId}`);
      }
    } catch (error) {
      console.error('[Access Revocation] Error checking access:', error);
    } finally {
      setIsChecking(false);
    }
  }, [user, activeBaby, allBabies, clearActiveBaby, setAllBabies, isChecking]);

  // Watch for failed mutations and check access
  useEffect(() => {
    if (!failedMutations || failedMutations.length === 0 || !user) {
      return;
    }

    // Get unique baby IDs from failed mutations
    const babyIds = new Set<number>();

    for (const mutation of failedMutations) {
      if (mutation.entityType === 'baby') {
        babyIds.add(Number(mutation.entityId));
      } else if (['feed_log', 'sleep_log', 'nappy_log'].includes(mutation.entityType)) {
        const payload = mutation.payload as { babyId?: number };
        if (payload.babyId) {
          babyIds.add(payload.babyId);
        }
      }
    }

    // Check each baby
    for (const babyId of babyIds) {
      void checkBabyAccess(babyId);
    }
  }, [failedMutations, user, checkBabyAccess]);

  // Handle closing the modal and redirecting
  const handleClose = useCallback(() => {
    setRevokedBaby(null);
    router.push(getI18nPath('/account/bootstrap', locale));
  }, [router, locale]);

  return {
    revokedBaby,
    handleClose,
    isChecking,
  };
}
