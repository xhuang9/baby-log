/**
 * Medication Types Operations
 *
 * Operations for managing user-created medication types.
 * These operations follow the offline-first pattern:
 * 1. Validate input
 * 2. Write to IndexedDB immediately
 * 3. Queue to outbox for sync
 * 4. Return optimistic result
 */

import type { LocalMedicationType } from '@/lib/local-db/types/medication-types';
import { addToOutbox, localDb } from '@/lib/local-db';
import { useUserStore } from '@/stores/useUserStore';
import { generateMutationId } from './types';

// ============================================================================
// Types
// ============================================================================

export type CreateMedicationTypeInput = {
  name: string;
};

export type MedicationTypeOperationResult<T = void> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// ============================================================================
// Create Medication Type
// ============================================================================

export async function createMedicationType(
  input: CreateMedicationTypeInput,
): Promise<MedicationTypeOperationResult<LocalMedicationType>> {
  try {
    // 1. Validate & trim name
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: 'Medication name cannot be empty' };
    }

    if (name.length > 100) {
      return { success: false, error: 'Medication name is too long (max 100 characters)' };
    }

    // 2. Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return { success: false, error: 'Not authenticated' };
    }

    // 3. Check for duplicate (case-insensitive)
    const allUserMedicationTypes = await localDb.medicationTypes
      .where('userId')
      .equals(user.localId)
      .toArray();

    const existing = allUserMedicationTypes.find(
      mt => mt.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      return { success: false, error: `"${name}" already exists` };
    }

    // 4. Generate UUID
    const id = crypto.randomUUID();

    // 5. Create LocalMedicationType object
    const now = new Date();
    const medicationType: LocalMedicationType = {
      id,
      userId: user.localId,
      name,
      createdAt: now,
      updatedAt: now,
    };

    // 6. Write to IndexedDB
    await localDb.medicationTypes.add(medicationType);

    // 7. Add to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'medication_type',
      entityId: id,
      op: 'create',
      payload: medicationType,
    });

    // 8. Background sync will be triggered automatically by outbox

    return { success: true, data: medicationType };
  } catch (error) {
    console.error('Failed to create medication type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create medication type',
    };
  }
}

// ============================================================================
// Delete Medication Type
// ============================================================================

export async function deleteMedicationType(id: string): Promise<MedicationTypeOperationResult> {
  try {
    // 1. Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Verify ownership
    const medicationType = await localDb.medicationTypes.get(id);
    if (!medicationType) {
      return { success: false, error: 'Medication type not found' };
    }

    if (medicationType.userId !== user.localId) {
      return { success: false, error: 'Permission denied' };
    }

    // 3. Delete from IndexedDB
    await localDb.medicationTypes.delete(id);

    // 4. Add to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'medication_type',
      entityId: id,
      op: 'delete',
      payload: { id },
    });

    // 5. Background sync will be triggered automatically

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete medication type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete medication type',
    };
  }
}
