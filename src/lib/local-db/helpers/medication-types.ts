/**
 * Medication Types Helper Functions
 *
 * Functions for managing medication types data in IndexedDB.
 */

import type { LocalMedicationType } from '../types/medication-types';
import { localDb } from '../database';

/**
 * Save medication types to local database
 */
export async function saveMedicationTypes(medicationTypes: LocalMedicationType[]): Promise<void> {
  await localDb.medicationTypes.bulkPut(medicationTypes);
}

/**
 * Get all medication types for a user
 */
export async function getMedicationTypesForUser(userId: number): Promise<LocalMedicationType[]> {
  const medicationTypes = await localDb.medicationTypes
    .where('userId')
    .equals(userId)
    .toArray();

  // Sort alphabetically by name
  return medicationTypes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a single medication type by ID
 */
export async function getMedicationType(id: string): Promise<LocalMedicationType | undefined> {
  return localDb.medicationTypes.get(id);
}

/**
 * Delete a medication type
 */
export async function deleteMedicationType(id: string): Promise<void> {
  await localDb.medicationTypes.delete(id);
}

/**
 * Check if a medication type name exists for a user (case-insensitive)
 */
export async function medicationTypeExistsForUser(userId: number, name: string): Promise<boolean> {
  const existing = await localDb.medicationTypes
    .where('[userId+name]')
    .equals([userId, name.toLowerCase()])
    .first();

  return !!existing;
}
