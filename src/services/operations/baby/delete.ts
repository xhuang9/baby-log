/**
 * Delete Baby Operation
 *
 * Soft deletes a baby by setting archivedAt.
 */

import type { OperationResult } from '../types';
import type { LocalBaby } from '@/lib/local-db';
import {
  addToOutbox,
  getLocalBaby,
  localDb,
  saveBabies,
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
 * Delete baby (soft delete)
 * - Sets archivedAt timestamp
 * - Removes from store if it was active
 * - Enqueues to outbox for sync
 */
export async function deleteBaby(
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

    // Get existing baby
    const existingBaby = await getLocalBaby(babyId);
    if (!existingBaby) {
      return failure('Baby not found');
    }

    // Check access (only owner can delete)
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, babyId])
      .first();

    if (!access || access.accessLevel !== 'owner') {
      return failure('Only the owner can delete a baby');
    }

    // Soft delete: set archivedAt
    const now = new Date();
    const archivedBaby: LocalBaby = {
      ...existingBaby,
      archivedAt: now,
      updatedAt: now,
    };

    await saveBabies([archivedBaby]);

    // Update stores - remove from active/allBabies
    const babyStore = useBabyStore.getState();
    const updatedAllBabies = babyStore.allBabies.filter(b => b.babyId !== babyId);

    babyStore.setAllBabies(updatedAllBabies);

    if (babyStore.activeBaby?.babyId === babyId) {
      // Switch to first available baby or clear
      const newActiveBaby = updatedAllBabies[0] ?? null;
      if (newActiveBaby) {
        babyStore.setActiveBaby(newActiveBaby);
      } else {
        babyStore.clearActiveBaby();
      }
    }

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'baby',
      entityId: String(babyId),
      op: 'delete',
      payload: {
        id: archivedBaby.id,
        name: archivedBaby.name,
        birthDate: archivedBaby.birthDate?.toISOString() ?? null,
        gender: archivedBaby.gender,
        birthWeightG: archivedBaby.birthWeightG,
        archivedAt: archivedBaby.archivedAt?.toISOString() ?? null,
        ownerUserId: archivedBaby.ownerUserId,
        updatedAt: archivedBaby.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    void flushOutbox();

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to delete baby',
    );
  }
}
