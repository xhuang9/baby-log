/**
 * Medication Log Operations
 *
 * Centralized operations for medication log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalMedicationLog, MedicationUnit } from '@/lib/local-db';
import { addToOutbox, localDb, saveMedicationLogs } from '@/lib/local-db';
import { flushOutbox } from '@/services/sync';
import { useUserStore } from '@/stores/useUserStore';

import {
  failure,
  generateMutationId,
  isClientSide,
  success,
} from './types';

// ============================================================================
// Input Types
// ============================================================================

export type CreateMedicationLogInput = {
  babyId: number;
  medicationTypeId: string;
  medicationType: string; // Display name
  amount: number;
  unit: MedicationUnit;
  startedAt: Date;
  notes?: string | null;
};

export type UpdateMedicationLogInput = {
  id: string;
  babyId: number;
  medicationTypeId?: string;
  medicationType?: string;
  amount?: number;
  unit?: MedicationUnit;
  startedAt?: Date;
  notes?: string | null;
};

// ============================================================================
// Medication Log Operations
// ============================================================================

/**
 * Create a new medication log entry
 * - Creates medication log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createMedicationLog(
  input: CreateMedicationLogInput,
): Promise<OperationResult<LocalMedicationLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.startedAt) {
      return failure('Start time is required');
    }

    if (!input.medicationTypeId || !input.medicationType) {
      return failure('Medication is required');
    }

    if (input.amount <= 0) {
      return failure('Amount must be greater than 0');
    }

    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Check access to baby
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, input.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Generate UUID for medication log (client-side ID)
    const medicationLogId = crypto.randomUUID();
    const now = new Date();

    // Create medication log object
    const medicationLog: LocalMedicationLog = {
      id: medicationLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      medicationTypeId: input.medicationTypeId,
      medicationType: input.medicationType,
      amount: input.amount,
      unit: input.unit,
      startedAt: input.startedAt,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveMedicationLogs([medicationLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'medication_log',
      entityId: medicationLogId,
      op: 'create',
      payload: {
        id: medicationLog.id,
        babyId: medicationLog.babyId,
        loggedByUserId: medicationLog.loggedByUserId,
        medicationTypeId: medicationLog.medicationTypeId,
        medicationType: medicationLog.medicationType,
        amount: medicationLog.amount,
        unit: medicationLog.unit,
        startedAt: medicationLog.startedAt.toISOString(),
        notes: medicationLog.notes,
        createdAt: medicationLog.createdAt.toISOString(),
        updatedAt: medicationLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(medicationLog);
  } catch (err) {
    console.error('Failed to create medication log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create medication log');
  }
}

/**
 * Update an existing medication log entry
 * - Updates medication log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updateMedicationLog(
  input: UpdateMedicationLogInput,
): Promise<OperationResult<LocalMedicationLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing medication log
    const existing = await localDb.medicationLogs.get(input.id);
    if (!existing) {
      return failure('Medication log not found');
    }

    // Verify access
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, input.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Update fields
    const updated: LocalMedicationLog = {
      ...existing,
      medicationTypeId: input.medicationTypeId ?? existing.medicationTypeId,
      medicationType: input.medicationType ?? existing.medicationType,
      amount: input.amount ?? existing.amount,
      unit: input.unit ?? existing.unit,
      startedAt: input.startedAt ?? existing.startedAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveMedicationLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'medication_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        medicationTypeId: updated.medicationTypeId,
        medicationType: updated.medicationType,
        amount: updated.amount,
        unit: updated.unit,
        startedAt: updated.startedAt.toISOString(),
        notes: updated.notes,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(updated);
  } catch (err) {
    console.error('Failed to update medication log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update medication log');
  }
}

/**
 * Delete a medication log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deleteMedicationLog(
  id: string,
  babyId: number,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Verify access
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Delete from IndexedDB
    await localDb.medicationLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'medication_log',
      entityId: id,
      op: 'delete',
      payload: {},
    });

    // Trigger background sync
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(undefined);
  } catch (err) {
    console.error('Failed to delete medication log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete medication log');
  }
}
