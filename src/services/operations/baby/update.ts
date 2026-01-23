/**
 * Update Baby Operation
 *
 * Updates an existing baby profile.
 */

import type { OperationResult } from '../types';
import type { UpdateBabyInput } from './types';
import type { LocalBaby, LocalBabyAccess } from '@/lib/local-db';
import {
  addToOutbox,
  getLocalBaby,
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
 * Update baby profile
 * - Updates baby record in IndexedDB
 * - Updates store if this is the active baby
 * - Enqueues to outbox for sync
 */
export async function updateBabyProfile(
  babyId: number,
  updates: UpdateBabyInput,
): Promise<OperationResult<LocalBaby>> {
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

    // Check access
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied');
    }

    // Apply updates
    const now = new Date();
    const updatedBaby: LocalBaby = {
      ...existingBaby,
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.birthDate !== undefined && { birthDate: updates.birthDate }),
      ...(updates.gender !== undefined && { gender: updates.gender }),
      ...(updates.birthWeightG !== undefined && { birthWeightG: updates.birthWeightG }),
      updatedAt: now,
    };

    // Validate
    if (!updatedBaby.name || updatedBaby.name.trim().length === 0) {
      return failure('Baby name is required');
    }

    // Write to IndexedDB in a transaction
    await localDb.transaction('rw', [localDb.babies, localDb.babyAccess], async () => {
      await saveBabies([updatedBaby]);

      // Update caregiverLabel in babyAccess if provided
      if (updates.caregiverLabel !== undefined) {
        const existingAccess = await localDb.babyAccess
          .where('[userId+babyId]')
          .equals([user.localId, babyId])
          .first();

        if (existingAccess) {
          const updatedAccess: LocalBabyAccess = {
            ...existingAccess,
            caregiverLabel: updates.caregiverLabel,
            updatedAt: now,
          };
          await saveBabyAccess([updatedAccess]);
        }
      }
    });

    // Update Zustand stores if this is the active baby
    const babyStore = useBabyStore.getState();
    if (babyStore.activeBaby?.babyId === babyId) {
      babyStore.setActiveBaby({
        ...babyStore.activeBaby,
        name: updatedBaby.name,
        ...(updates.caregiverLabel !== undefined && { caregiverLabel: updates.caregiverLabel }),
      });
    }

    // Update allBabies list
    const updatedAllBabies = babyStore.allBabies.map(b =>
      b.babyId === babyId
        ? {
            ...b,
            name: updatedBaby.name,
            ...(updates.caregiverLabel !== undefined && { caregiverLabel: updates.caregiverLabel }),
          }
        : b,
    );
    babyStore.setAllBabies(updatedAllBabies);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'baby',
      entityId: String(babyId),
      op: 'update',
      payload: {
        id: updatedBaby.id,
        name: updatedBaby.name,
        birthDate: updatedBaby.birthDate?.toISOString() ?? null,
        gender: updatedBaby.gender,
        birthWeightG: updatedBaby.birthWeightG,
        archivedAt: updatedBaby.archivedAt?.toISOString() ?? null,
        ownerUserId: updatedBaby.ownerUserId,
        updatedAt: updatedBaby.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    void flushOutbox();

    return success(updatedBaby);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to update baby',
    );
  }
}
