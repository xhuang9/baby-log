/**
 * Apply Medication Log Changes
 *
 * Applies medication log entity changes from the server to local IndexedDB.
 */

import type { LocalMedicationLog } from '@/lib/local-db';
import { deleteMedicationLog, saveMedicationLogs } from '@/lib/local-db';

/**
 * Apply a medication log change from the server
 */
export async function applyMedicationLogChange(
  op: string,
  id: number | string,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deleteMedicationLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const medicationLog: LocalMedicationLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    medicationType: data.medicationType as string,
    medicationTypeId: data.medicationTypeId as string,
    amount: data.amount as number,
    unit: data.unit as LocalMedicationLog['unit'],
    startedAt: new Date(data.startedAt as string),
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveMedicationLogs([medicationLog]);
}
