/**
 * Timer Store Tests
 *
 * Unit tests for timer state management and persistence
 */

import type { TimerState } from './useTimerStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimerStore } from './useTimerStore';

// Mock dependencies
vi.mock('@/lib/local-db/helpers/ui-config', () => ({
  getUIConfig: vi.fn(),
  updateUIConfig: vi.fn(),
}));

vi.mock('./useUserStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      user: {
        localId: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
      },
    })),
  },
}));

describe('useTimerStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset store state
    useTimerStore.setState({
      timers: {},
      isHydrated: false,
    });

    // Reset user store to default authenticated state
    const { useUserStore } = await import('./useUserStore');
    vi.mocked(useUserStore.getState).mockReturnValue({
      user: {
        id: 'user_123',
        localId: 1,
        firstName: null,
        email: 'test@example.com',
        imageUrl: '',
      },
      isHydrated: true,
      setUser: vi.fn(),
      clearUser: vi.fn(),
      hydrate: vi.fn(),
      hydrateFromIndexedDB: vi.fn(),
    });
  });

  describe('hydrate', () => {
    it('should load timers from IndexedDB', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      const mockTimers: Record<string, TimerState> = {
        'feed-1': {
          elapsedSeconds: 120,
          lastStartTime: null,
          babyId: 1,
          logType: 'feed',
        },
      };

      vi.mocked(getUIConfig).mockResolvedValue({
        data: { timers: mockTimers },
      } as never);

      await useTimerStore.getState().hydrate(1);

      const state = useTimerStore.getState();

      expect(state.timers).toEqual(mockTimers);
      expect(state.isHydrated).toBe(true);
    });

    it('should handle missing timers in config', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockResolvedValue({
        data: {},
      } as never);

      await useTimerStore.getState().hydrate(1);

      const state = useTimerStore.getState();

      expect(state.timers).toEqual({});
      expect(state.isHydrated).toBe(true);
    });

    it('should handle hydration errors gracefully', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockRejectedValue(new Error('DB error'));

      await useTimerStore.getState().hydrate(1);

      const state = useTimerStore.getState();

      expect(state.isHydrated).toBe(true);
    });
  });

  describe('startTimer', () => {
    it('should start a new timer', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      await useTimerStore.getState().startTimer('feed-1', 1, 'feed');

      const state = useTimerStore.getState();
      const timer = state.timers['feed-1'];

      expect(timer).toBeDefined();
      expect(timer?.babyId).toBe(1);
      expect(timer?.logType).toBe('feed');
      expect(timer?.elapsedSeconds).toBe(0);
      expect(timer?.lastStartTime).toBeTruthy();

      // Verify persistence
      expect(updateUIConfig).toHaveBeenCalledWith(1, {
        timers: expect.objectContaining({
          'feed-1': expect.objectContaining({
            babyId: 1,
            logType: 'feed',
          }),
        }),
      });
    });

    it('should resume a paused timer', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      // Set up a paused timer
      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 60,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      await useTimerStore.getState().startTimer('feed-1', 1, 'feed');

      const state = useTimerStore.getState();
      const timer = state.timers['feed-1'];

      expect(timer?.elapsedSeconds).toBe(60);
      expect(timer?.lastStartTime).toBeTruthy();
      expect(updateUIConfig).toHaveBeenCalled();
    });
  });

  describe('pauseTimer', () => {
    it('should pause a running timer and accumulate elapsed time', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      const startTime = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago

      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 10,
            lastStartTime: startTime,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      await useTimerStore.getState().pauseTimer('feed-1');

      const state = useTimerStore.getState();
      const timer = state.timers['feed-1'];

      expect(timer?.lastStartTime).toBeNull();
      expect(timer?.elapsedSeconds).toBeGreaterThanOrEqual(15); // 10 + ~5
      expect(updateUIConfig).toHaveBeenCalled();
    });

    it('should not pause an already paused timer', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 10,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      await useTimerStore.getState().pauseTimer('feed-1');

      expect(updateUIConfig).not.toHaveBeenCalled();
    });

    it('should not pause a non-existent timer', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      await useTimerStore.getState().pauseTimer('feed-999');

      expect(updateUIConfig).not.toHaveBeenCalled();
    });
  });

  describe('resetTimer', () => {
    it('should remove timer from state', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 120,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      await useTimerStore.getState().resetTimer('feed-1');

      const state = useTimerStore.getState();

      expect(state.timers['feed-1']).toBeUndefined();
      expect(updateUIConfig).toHaveBeenCalledWith(1, { timers: {} });
    });

    it('should not error when resetting non-existent timer', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      await useTimerStore.getState().resetTimer('feed-999');

      expect(updateUIConfig).toHaveBeenCalled();
    });
  });

  describe('adjustTimer', () => {
    it('should adjust elapsed time', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 60,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      await useTimerStore.getState().adjustTimer('feed-1', 10);

      const state = useTimerStore.getState();

      expect(state.timers['feed-1']?.elapsedSeconds).toBe(70);
      expect(updateUIConfig).toHaveBeenCalled();
    });

    it('should not allow negative elapsed time', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 10,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      await useTimerStore.getState().adjustTimer('feed-1', -20);

      const state = useTimerStore.getState();

      expect(state.timers['feed-1']?.elapsedSeconds).toBe(0);
      expect(updateUIConfig).toHaveBeenCalled();
    });

    it('should not adjust non-existent timer', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      await useTimerStore.getState().adjustTimer('feed-999', 10);

      expect(updateUIConfig).not.toHaveBeenCalled();
    });
  });

  describe('getTimer', () => {
    it('should return timer state', () => {
      const mockTimer: TimerState = {
        elapsedSeconds: 60,
        lastStartTime: null,
        babyId: 1,
        logType: 'feed',
      };

      useTimerStore.setState({
        timers: { 'feed-1': mockTimer },
        isHydrated: true,
      });

      const timer = useTimerStore.getState().getTimer('feed-1');

      expect(timer).toEqual(mockTimer);
    });

    it('should return undefined for non-existent timer', () => {
      const timer = useTimerStore.getState().getTimer('feed-999');

      expect(timer).toBeUndefined();
    });
  });

  describe('getTotalElapsed', () => {
    it('should return elapsed time for paused timer', () => {
      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 120,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      const elapsed = useTimerStore.getState().getTotalElapsed('feed-1');

      expect(elapsed).toBe(120);
    });

    it('should calculate total elapsed time for running timer', () => {
      const startTime = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago

      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 10,
            lastStartTime: startTime,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      const elapsed = useTimerStore.getState().getTotalElapsed('feed-1');

      expect(elapsed).toBeGreaterThanOrEqual(15); // 10 + ~5
    });

    it('should return 0 for non-existent timer', () => {
      const elapsed = useTimerStore.getState().getTotalElapsed('feed-999');

      expect(elapsed).toBe(0);
    });
  });

  describe('getActualStartTime', () => {
    it('should calculate actual start time from elapsed seconds', () => {
      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 120,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      const startTime = useTimerStore.getState().getActualStartTime('feed-1');

      expect(startTime).toBeInstanceOf(Date);

      if (startTime) {
        const expectedTime = Date.now() - (120 * 1000);

        expect(Math.abs(startTime.getTime() - expectedTime)).toBeLessThan(100); // Within 100ms
      }
    });

    it('should return null for timer with no elapsed time', () => {
      useTimerStore.setState({
        timers: {
          'feed-1': {
            elapsedSeconds: 0,
            lastStartTime: null,
            babyId: 1,
            logType: 'feed',
          },
        },
        isHydrated: true,
      });

      const startTime = useTimerStore.getState().getActualStartTime('feed-1');

      expect(startTime).toBeNull();
    });

    it('should return null for non-existent timer', () => {
      const startTime = useTimerStore.getState().getActualStartTime('feed-999');

      expect(startTime).toBeNull();
    });
  });
});
