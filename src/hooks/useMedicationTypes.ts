/**
 * Medication Types Hook
 *
 * Hook for managing user's medication types in the UI.
 * Provides live-reactive access to medication types from IndexedDB.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db/database';
import { createMedicationType, deleteMedicationType } from '@/services/operations/medication-types';
import { useUserStore } from '@/stores/useUserStore';

export function useMedicationTypes() {
  const user = useUserStore(state => state.user);

  const medicationTypes = useLiveQuery(
    () => {
      if (!user?.localId) {
        return [];
      }

      return localDb.medicationTypes
        .where('userId')
        .equals(user.localId)
        .toArray();
    },
    [user?.localId],
  );

  const createMedication = async (name: string) => {
    return await createMedicationType({ name: name.trim() });
  };

  const deleteMedication = async (id: string) => {
    return await deleteMedicationType(id);
  };

  return {
    medicationTypes: medicationTypes ?? [],
    createMedication,
    deleteMedication,
    isLoading: medicationTypes === undefined,
  };
}
