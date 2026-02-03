/**
 * Food Types Helper Functions
 *
 * Functions for managing food types data in IndexedDB.
 */

import type { LocalFoodType } from '../types/food-types';
import { localDb } from '../database';

/**
 * Save food types to local database
 */
export async function saveFoodTypes(foodTypes: LocalFoodType[]): Promise<void> {
  await localDb.foodTypes.bulkPut(foodTypes);
}

/**
 * Get all food types for a user
 */
export async function getFoodTypesForUser(userId: number): Promise<LocalFoodType[]> {
  const foodTypes = await localDb.foodTypes
    .where('userId')
    .equals(userId)
    .toArray();

  // Sort alphabetically by name
  return foodTypes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a single food type by ID
 */
export async function getFoodType(id: string): Promise<LocalFoodType | undefined> {
  return localDb.foodTypes.get(id);
}

/**
 * Delete a food type
 */
export async function deleteFoodType(id: string): Promise<void> {
  await localDb.foodTypes.delete(id);
}

/**
 * Check if a food type name exists for a user (case-insensitive)
 */
export async function foodTypeExistsForUser(userId: number, name: string): Promise<boolean> {
  const existing = await localDb.foodTypes
    .where('[userId+name]')
    .equals([userId, name.toLowerCase()])
    .first();

  return !!existing;
}
