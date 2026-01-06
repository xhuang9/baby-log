import { create } from 'zustand';

export type ActiveBaby = {
  babyId: number;
  name: string;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
};

type BabyStore = {
  activeBaby: ActiveBaby | null;
  setActiveBaby: (baby: ActiveBaby) => void;
  clearActiveBaby: () => void;
};

export const useBabyStore = create<BabyStore>(set => ({
  activeBaby: null,
  setActiveBaby: (baby) => {
    set({ activeBaby: baby });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('baby-log:active-baby', JSON.stringify(baby));
    }
  },
  clearActiveBaby: () => {
    set({ activeBaby: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baby-log:active-baby');
    }
  },
}));
