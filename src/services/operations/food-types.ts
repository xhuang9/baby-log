/**
 * Food Types Operations
 *
 * Operations for managing user-created food types.
 * These operations follow the offline-first pattern:
 * 1. Validate input
 * 2. Write to IndexedDB immediately
 * 3. Queue to outbox for sync
 * 4. Return optimistic result
 */

import type { LocalFoodType } from '@/lib/local-db/types/food-types';
import { addToOutbox, localDb } from '@/lib/local-db';
import { useUserStore } from '@/stores/useUserStore';
import { generateMutationId } from './types';

// ============================================================================
// Types
// ============================================================================

export type CreateFoodTypeInput = {
  name: string;
};

export type OperationResult<T = void> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// ============================================================================
// Create Food Type
// ============================================================================

export async function createFoodType(
  input: CreateFoodTypeInput,
): Promise<OperationResult<LocalFoodType>> {
  try {
    // 1. Validate & trim name
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: 'Food name cannot be empty' };
    }

    if (name.length > 100) {
      return { success: false, error: 'Food name is too long (max 100 characters)' };
    }

    // 2. Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return { success: false, error: 'Not authenticated' };
    }

    // 3. Check for duplicate (case-insensitive)
    const allUserFoodTypes = await localDb.foodTypes
      .where('userId')
      .equals(user.localId)
      .toArray();

    const existing = allUserFoodTypes.find(
      ft => ft.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      return { success: false, error: `"${name}" already exists` };
    }

    // 4. Generate UUID
    const id = crypto.randomUUID();

    // 5. Create LocalFoodType object
    const now = new Date();
    const foodType: LocalFoodType = {
      id,
      userId: user.localId,
      name,
      createdAt: now,
      updatedAt: now,
    };

    // 6. Write to IndexedDB
    await localDb.foodTypes.add(foodType);

    // 7. Add to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'food_type',
      entityId: id,
      op: 'create',
      payload: foodType,
    });

    // 8. Background sync will be triggered automatically by outbox

    return { success: true, data: foodType };
  } catch (error) {
    console.error('Failed to create food type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create food type',
    };
  }
}

// ============================================================================
// Delete Food Type
// ============================================================================

export async function deleteFoodType(id: string): Promise<OperationResult> {
  try {
    // 1. Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Verify ownership
    const foodType = await localDb.foodTypes.get(id);
    if (!foodType) {
      return { success: false, error: 'Food type not found' };
    }

    if (foodType.userId !== user.localId) {
      return { success: false, error: 'Permission denied' };
    }

    // 3. Delete from IndexedDB
    await localDb.foodTypes.delete(id);

    // 4. Add to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'food_type',
      entityId: id,
      op: 'delete',
      payload: { id },
    });

    // 5. Background sync will be triggered automatically

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete food type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete food type',
    };
  }
}
