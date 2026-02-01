/**
 * Apply Food Types Changes
 *
 * Applies food type entity changes from the server to local IndexedDB.
 */

import type { LocalFoodType } from '@/lib/local-db/types/food-types';
import { localDb } from '@/lib/local-db/database';

/**
 * Apply food types from server to IndexedDB
 */
export async function applyFoodTypeSync(serverFoodTypes: Record<string, unknown>[]): Promise<void> {
  if (!serverFoodTypes || serverFoodTypes.length === 0) {
    return;
  }

  const localFoodTypes: LocalFoodType[] = serverFoodTypes.map((data) => ({
    id: data.id as string,
    userId: data.userId as number,
    name: data.name as string,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  }));

  // Bulk upsert to IndexedDB (LWW via updatedAt)
  await localDb.foodTypes.bulkPut(localFoodTypes);
}

/**
 * Apply a single food type change from sync events
 */
export async function applyFoodTypeChange(
  op: string,
  id: string,
  data: Record<string, unknown> | null,
): Promise<void> {
  if (op === 'delete') {
    await localDb.foodTypes.delete(id);
    return;
  }

  if (!data) {
    return;
  }

  const foodType: LocalFoodType = {
    id: data.id as string,
    userId: data.userId as number,
    name: data.name as string,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await localDb.foodTypes.put(foodType);
}
