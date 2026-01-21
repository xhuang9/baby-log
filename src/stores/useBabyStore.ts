/**
 * Baby Store
 *
 * Manages the active baby and all accessible babies with dual persistence:
 * - sessionStorage for fast hydration
 * - IndexedDB for offline-first durability
 *
 * @see .readme/planning/01-state-management-sync.md
 */

import { create } from 'zustand';

export type ActiveBaby = {
  babyId: number;
  name: string;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
};

type BabyStore = {
  activeBaby: ActiveBaby | null;
  allBabies: ActiveBaby[];
  isHydrated: boolean;
  setActiveBaby: (baby: ActiveBaby) => void;
  setAllBabies: (babies: ActiveBaby[]) => void;
  clearActiveBaby: () => void;
  hydrate: () => void;
  hydrateFromIndexedDB: (userId: number) => Promise<void>;
};

const getStoredBaby = (): ActiveBaby | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = sessionStorage.getItem('baby-log:active-baby');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getStoredBabies = (): ActiveBaby[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = sessionStorage.getItem('baby-log:all-babies');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const useBabyStore = create<BabyStore>((set, get) => ({
  activeBaby: null,
  allBabies: [],
  isHydrated: false,

  setActiveBaby: (baby) => {
    set({ activeBaby: baby });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('baby-log:active-baby', JSON.stringify(baby));
    }
  },

  setAllBabies: (babies) => {
    set({ allBabies: babies });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('baby-log:all-babies', JSON.stringify(babies));
    }
  },

  clearActiveBaby: () => {
    set({ activeBaby: null, allBabies: [] });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baby-log:active-baby');
      sessionStorage.removeItem('baby-log:all-babies');
    }
  },

  hydrate: () => {
    const stored = getStoredBaby();
    const storedBabies = getStoredBabies();
    set({ activeBaby: stored, allBabies: storedBabies, isHydrated: true });
  },

  hydrateFromIndexedDB: async (userId: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { localDb } = await import('@/lib/local-db');

      // Get baby access records for this user
      const accessRecords = await localDb.babyAccess
        .where('userId')
        .equals(userId)
        .toArray();

      if (accessRecords.length === 0) {
        set({ isHydrated: true });
        return;
      }

      // Get baby details
      const babyIds = accessRecords.map(a => a.babyId);
      const babies = await localDb.babies
        .where('id')
        .anyOf(babyIds)
        .toArray();

      // Build ActiveBaby list
      const allBabies: ActiveBaby[] = [];
      for (const access of accessRecords) {
        const baby = babies.find(b => b.id === access.babyId);
        if (baby) {
          allBabies.push({
            babyId: baby.id,
            name: baby.name,
            accessLevel: access.accessLevel,
            caregiverLabel: access.caregiverLabel,
          });
        }
      }

      // Determine active baby
      let activeBaby = get().activeBaby;
      if (!activeBaby && allBabies.length > 0) {
        // Use first baby as default
        activeBaby = allBabies[0] ?? null;
      } else if (activeBaby) {
        // Verify the active baby is still in the list
        const stillExists = allBabies.some(b => b.babyId === activeBaby!.babyId);
        if (!stillExists) {
          activeBaby = allBabies[0] ?? null;
        }
      }

      // Update store and sessionStorage
      set({ activeBaby, allBabies, isHydrated: true });

      if (activeBaby) {
        sessionStorage.setItem('baby-log:active-baby', JSON.stringify(activeBaby));
      }
      sessionStorage.setItem('baby-log:all-babies', JSON.stringify(allBabies));
    } catch (error) {
      console.error('Failed to hydrate babies from IndexedDB:', error);
      // Fall back to sessionStorage hydration
      get().hydrate();
    }
  },
}));
