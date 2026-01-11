/**
 * User Store
 *
 * Manages the current user state with dual persistence:
 * - sessionStorage for fast hydration
 * - IndexedDB for offline-first durability
 *
 * @see .readme/planning/01-state-management-sync.md
 */

import type { LocalUser } from '@/lib/local-db';
import { create } from 'zustand';

export type StoredUser = {
  id: string; // Clerk ID
  localId: number; // Local database user ID
  firstName: string | null;
  email: string | null;
  imageUrl: string;
};

type UserStore = {
  user: StoredUser | null;
  isHydrated: boolean;
  setUser: (user: StoredUser) => void;
  clearUser: () => void;
  hydrate: () => void;
  hydrateFromIndexedDB: () => Promise<void>;
};

const getStoredUser = (): StoredUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = sessionStorage.getItem('baby-log:user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isHydrated: false,

  setUser: (user) => {
    set({ user });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('baby-log:user', JSON.stringify(user));
    }
  },

  clearUser: () => {
    set({ user: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baby-log:user');
    }
  },

  hydrate: () => {
    const stored = getStoredUser();
    set({ user: stored, isHydrated: true });
  },

  hydrateFromIndexedDB: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { localDb } = await import('@/lib/local-db');
      const users = await localDb.users.toArray();

      if (users.length > 0) {
        const localUser = users[0] as LocalUser;
        const storedUser: StoredUser = {
          id: localUser.clerkId,
          localId: localUser.id,
          firstName: localUser.firstName,
          email: localUser.email,
          imageUrl: localUser.imageUrl ?? '',
        };

        // Update both store and sessionStorage
        set({ user: storedUser, isHydrated: true });
        sessionStorage.setItem('baby-log:user', JSON.stringify(storedUser));
      } else {
        set({ isHydrated: true });
      }
    } catch (error) {
      console.error('Failed to hydrate user from IndexedDB:', error);
      // Fall back to sessionStorage hydration
      get().hydrate();
    }
  },
}));
