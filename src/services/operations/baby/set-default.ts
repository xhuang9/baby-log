/**
 * Set Default Baby Operation
 *
 * Switches the active baby for the current user.
 */

import type { OperationResult } from '../types';
import type { LocalBabyAccess } from '@/lib/local-db';
import type { ActiveBaby } from '@/stores/useBabyStore';
import {
  getLocalBaby,
  localDb,
  saveBabyAccess,
} from '@/lib/local-db';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';
import {
  failure,
  isClientSide,
  success,
} from '../types';

/**
 * Set default baby (switch active baby)
 * - Updates user's defaultBabyId in IndexedDB
 * - Updates babyAccess lastAccessedAt timestamp
 * - Updates active baby in store
 */
export async function setDefaultBaby(
  babyId: number,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Get baby and access
    const baby = await getLocalBaby(babyId);
    if (!baby) {
      return failure('Baby not found');
    }

    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, babyId])
      .first();

    if (!access) {
      return failure('Access denied');
    }

    const now = new Date();

    // Transaction to update BOTH user.defaultBabyId AND babyAccess
    await localDb.transaction('rw', [localDb.users, localDb.babyAccess], async () => {
      // Update user's defaultBabyId in IndexedDB
      await localDb.users.update(user.localId, {
        defaultBabyId: babyId,
        updatedAt: now,
      });

      // Update lastAccessedAt on babyAccess
      const updatedAccess: LocalBabyAccess = {
        ...access,
        lastAccessedAt: now,
        updatedAt: now,
      };
      await saveBabyAccess([updatedAccess]);
    });

    // Update active baby in store
    const activeBaby: ActiveBaby = {
      babyId: baby.id,
      name: baby.name,
      accessLevel: access.accessLevel,
      caregiverLabel: access.caregiverLabel,
    };

    useBabyStore.getState().setActiveBaby(activeBaby);

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to set default baby',
    );
  }
}
