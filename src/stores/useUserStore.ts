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
  setUser: (user: StoredUser) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserStore>(set => ({
  user: null,
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
}));
