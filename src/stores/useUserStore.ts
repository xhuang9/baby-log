import { create } from 'zustand';

export type StoredUser = {
  id: string;
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
  setUser: user => set({ user }),
  clearUser: () => set({ user: null }),
}));
