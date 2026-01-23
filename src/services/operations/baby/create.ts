/**
 * Create Baby Operation
 *
 * Creates a new baby record with owner access.
 */

import type { OperationResult } from '../types';
import type { CreateBabyInput } from './types';
import type { LocalBaby, LocalBabyAccess } from '@/lib/local-db';
import type { ActiveBaby } from '@/stores/useBabyStore';
import {
  addToOutbox,
  getAllLocalBabies,
  localDb,
  saveBabies,
  saveBabyAccess,
} from '@/lib/local-db';
import { flushOutbox } from '@/services/sync';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';
import {
  failure,
  generateMutationId,
  isClientSide,
  success,
} from '../types';

/**
 * Create a new baby
 * - Creates baby record in IndexedDB
 * - Creates owner access record
 * - Sets as active baby in store
 * - Enqueues to outbox for sync
 */
export async function createBaby(
  input: CreateBabyInput,
): Promise<OperationResult<LocalBaby>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return failure('Baby name is required');
    }

    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Generate a temporary ID for the baby (will be replaced by server ID on sync)
    const tempId = Date.now();
    const now = new Date();

    const baby: LocalBaby = {
      id: tempId,
      name: input.name.trim(),
      birthDate: input.birthDate ?? null,
      gender: input.gender ?? null,
      birthWeightG: input.birthWeightG ?? null,
      archivedAt: null,
      ownerUserId: user.localId,
      createdAt: now,
      updatedAt: now,
    };

    const babyAccess: LocalBabyAccess = {
      userId: user.localId,
      babyId: tempId,
      accessLevel: 'owner',
      caregiverLabel: input.caregiverLabel ?? null,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB in a transaction
    await localDb.transaction('rw', [localDb.babies, localDb.babyAccess], async () => {
      await saveBabies([baby]);
      await saveBabyAccess([babyAccess]);
    });

    // Update Zustand stores
    const activeBaby: ActiveBaby = {
      babyId: baby.id,
      name: baby.name,
      accessLevel: 'owner',
      caregiverLabel: null,
    };

    const babyStore = useBabyStore.getState();
    const currentBabies = await getAllLocalBabies();
    const currentAccess = await localDb.babyAccess
      .where('userId')
      .equals(user.localId)
      .toArray();

    const allBabies: ActiveBaby[] = currentAccess.map((access) => {
      const babyData = currentBabies.find(b => b.id === access.babyId);
      return {
        babyId: access.babyId,
        name: babyData?.name ?? 'Unknown',
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
      };
    });

    babyStore.setActiveBaby(activeBaby);
    babyStore.setAllBabies(allBabies);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'baby',
      entityId: String(baby.id),
      op: 'create',
      payload: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate?.toISOString() ?? null,
        gender: baby.gender,
        birthWeightG: baby.birthWeightG,
        ownerUserId: baby.ownerUserId,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    void flushOutbox();

    return success(baby);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to create baby',
    );
  }
}
