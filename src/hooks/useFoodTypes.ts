/**
 * Food Types Hook
 *
 * Hook for managing user's food types in the UI.
 * Provides live-reactive access to food types from IndexedDB.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db/database';
import { createFoodType, deleteFoodType } from '@/services/operations/food-types';
import { useUserStore } from '@/stores/useUserStore';

export function useFoodTypes() {
  const user = useUserStore(state => state.user);

  const foodTypes = useLiveQuery(
    () => {
      if (!user?.localId) {
        return [];
      }

      return localDb.foodTypes
        .where('userId')
        .equals(user.localId)
        .toArray();
    },
    [user?.localId],
  );

  const createFood = async (name: string) => {
    return await createFoodType({ name: name.trim() });
  };

  const deleteFood = async (id: string) => {
    return await deleteFoodType(id);
  };

  return {
    foodTypes: foodTypes ?? [],
    createFood,
    deleteFood,
    isLoading: foodTypes === undefined,
  };
}
