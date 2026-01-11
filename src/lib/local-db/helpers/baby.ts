/**
 * Baby Helper Functions
 *
 * Functions for managing baby and baby access data in IndexedDB.
 */

import type { LocalBaby, LocalBabyAccess } from '../types/entities';
import { localDb } from '../database';

/**
 * Save babies to local database
 */
export async function saveBabies(babies: LocalBaby[]): Promise<void> {
  await localDb.babies.bulkPut(babies);
}

/**
 * Get all babies from local database
 */
export async function getAllLocalBabies(): Promise<LocalBaby[]> {
  return localDb.babies.toArray();
}

/**
 * Get a single baby by ID
 */
export async function getLocalBaby(babyId: number): Promise<LocalBaby | undefined> {
  return localDb.babies.get(babyId);
}

/**
 * Save baby access records
 */
export async function saveBabyAccess(accessRecords: LocalBabyAccess[]): Promise<void> {
  await localDb.babyAccess.bulkPut(accessRecords);
}

/**
 * Get baby access for a user
 */
export async function getBabyAccessForUser(userId: number): Promise<LocalBabyAccess[]> {
  return localDb.babyAccess.where('oduserId').equals(userId).toArray();
}

/**
 * Get baby access for a specific baby
 */
export async function getBabyAccessForBaby(babyId: number): Promise<LocalBabyAccess[]> {
  return localDb.babyAccess.where('babyId').equals(babyId).toArray();
}
