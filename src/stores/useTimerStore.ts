/**
 * Timer Store
 *
 * Manages timer state for activity tracking (feed, sleep, nappy).
 * Persists to IndexedDB via uiConfig for cross-session persistence.
 */

import { create } from 'zustand';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from './useUserStore';

export type TimerState = {
  elapsedSeconds: number; // Accumulated elapsed time in seconds
  lastStartTime: string | null; // ISO timestamp of when current session started (null if paused)
  babyId: number;
  logType: 'feed' | 'sleep' | 'nappy';
};

export type TimerStore = {
  timers: Record<string, TimerState>; // key format: "feed-123" or "sleep-456"
  isHydrated: boolean;

  // Actions
  hydrate: (userId: number) => Promise<void>;
  getTimer: (key: string) => TimerState | undefined;
  getTotalElapsed: (key: string) => number;
  getActualStartTime: (key: string) => Date | null;
  startTimer: (key: string, babyId: number, logType: 'feed' | 'sleep' | 'nappy') => Promise<void>;
  pauseTimer: (key: string) => Promise<void>;
  resetTimer: (key: string) => Promise<void>;
  adjustTimer: (key: string, seconds: number) => Promise<void>;
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  timers: {},
  isHydrated: false,

  hydrate: async (userId: number) => {
    try {
      const config = await getUIConfig(userId);
      const timers = (config.data.timers as Record<string, TimerState>) ?? {};
      set({ timers, isHydrated: true });
    } catch (error) {
      console.error('[TimerStore] Failed to hydrate:', error);
      set({ isHydrated: true });
    }
  },

  getTimer: (key: string) => {
    return get().timers[key];
  },

  getTotalElapsed: (key: string) => {
    const timer = get().timers[key];
    if (!timer) {
      return 0;
    }

    let totalElapsed = timer.elapsedSeconds;
    if (timer.lastStartTime) {
      const lastStart = new Date(timer.lastStartTime).getTime();
      const now = Date.now();
      const sessionElapsed = Math.floor((now - lastStart) / 1000);
      totalElapsed += sessionElapsed;
    }
    return totalElapsed;
  },

  getActualStartTime: (key: string) => {
    const totalElapsed = get().getTotalElapsed(key);
    if (totalElapsed === 0) {
      return null;
    }
    return new Date(Date.now() - (totalElapsed * 1000));
  },

  startTimer: async (key: string, babyId: number, logType: 'feed' | 'sleep' | 'nappy') => {
    const currentTimer = get().timers[key];
    const now = new Date().toISOString();

    const newTimer: TimerState = {
      elapsedSeconds: currentTimer?.elapsedSeconds ?? 0,
      lastStartTime: now,
      babyId,
      logType,
    };

    const newTimers = {
      ...get().timers,
      [key]: newTimer,
    };

    set({ timers: newTimers });

    // Persist to IndexedDB
    const userId = useUserStore.getState().user?.localId;
    if (userId) {
      await updateUIConfig(userId, { timers: newTimers });
    }
  },

  pauseTimer: async (key: string) => {
    const currentTimer = get().timers[key];
    if (!currentTimer || !currentTimer.lastStartTime) {
      return;
    }

    // Calculate elapsed time since last start
    const now = Date.now();
    const lastStart = new Date(currentTimer.lastStartTime).getTime();
    const sessionElapsed = Math.floor((now - lastStart) / 1000);

    const updatedTimer: TimerState = {
      ...currentTimer,
      elapsedSeconds: currentTimer.elapsedSeconds + sessionElapsed,
      lastStartTime: null, // Paused
    };

    const newTimers = {
      ...get().timers,
      [key]: updatedTimer,
    };

    set({ timers: newTimers });

    // Persist to IndexedDB
    const userId = useUserStore.getState().user?.localId;
    if (userId) {
      await updateUIConfig(userId, { timers: newTimers });
    }
  },

  resetTimer: async (key: string) => {
    const { [key]: _, ...remainingTimers } = get().timers;
    set({ timers: remainingTimers });

    // Persist to IndexedDB
    const userId = useUserStore.getState().user?.localId;
    if (userId) {
      await updateUIConfig(userId, { timers: remainingTimers });
    }
  },

  adjustTimer: async (key: string, seconds: number) => {
    const currentTimer = get().timers[key];
    if (!currentTimer) {
      return;
    }

    // Adjust elapsed seconds directly (cannot go below 0)
    const newElapsedSeconds = Math.max(0, currentTimer.elapsedSeconds + seconds);

    const updatedTimer: TimerState = {
      ...currentTimer,
      elapsedSeconds: newElapsedSeconds,
    };

    const newTimers = {
      ...get().timers,
      [key]: updatedTimer,
    };

    set({ timers: newTimers });

    // Persist to IndexedDB
    const userId = useUserStore.getState().user?.localId;
    if (userId) {
      await updateUIConfig(userId, { timers: newTimers });
    }
  },
}));
