/**
 * Baby Operations
 *
 * Centralized operations for baby CRUD. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores for instant UI feedback
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { LocalBaby, LocalBabyAccess } from '@/lib/local-db';
import {
  addToOutbox,
  getAllLocalBabies,
  getLocalBaby,
  localDb,
  saveBabies,
  saveBabyAccess,
} from '@/lib/local-db';
import { flushOutbox } from '@/services/sync-service';
import { useBabyStore, type ActiveBaby } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

import {
  failure,
  generateMutationId,
  isClientSide,
  success,
  type OperationResult,
} from './types';

// ============================================================================
// Input Types
// ============================================================================

export type CreateBabyInput = {
  name: string;
  birthDate?: Date | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
};

export type UpdateBabyInput = {
  name?: string;
  birthDate?: Date | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
};

// ============================================================================
// Baby Operations
// ============================================================================

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
      oduserId: user.localId,
      babyId: tempId,
      accessLevel: 'owner',
      caregiverLabel: input.caregiverLabel ?? null,
      lastAccessedAt: now,
      defaultBaby: true,
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
      .where('oduserId')
      .equals(user.localId)
      .toArray();

    const allBabies: ActiveBaby[] = currentAccess.map(access => {
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
      .where('[oduserId+babyId]')
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
          .where('[oduserId+babyId]')
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
        : b
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

/**
 * Set default baby (switch active baby)
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
      .where('[oduserId+babyId]')
      .equals([user.localId, babyId])
      .first();

    if (!access) {
      return failure('Access denied');
    }

    // Update lastAccessedAt
    const now = new Date();
    const updatedAccess: LocalBabyAccess = {
      ...access,
      lastAccessedAt: now,
      defaultBaby: true,
      updatedAt: now,
    };

    await saveBabyAccess([updatedAccess]);

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
      .where('[oduserId+babyId]')
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
