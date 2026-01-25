/**
 * Timer Store Mutation Tests
 *
 * Tests for state-changing operations:
 * - Starting and resuming timers
 * - Pausing timers and accumulating elapsed time
 * - Resetting timers
 * - Adjusting elapsed time
 *
 * All mutations persist to IndexedDB via updateUIConfig
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetTimerStoreState } from './__test-utils__/timer-store-setup';
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

describe('useTimerStore - Mutations', () => {
  beforeEach(async () => {
    await resetTimerStoreState();
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
});
