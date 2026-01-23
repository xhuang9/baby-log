/**
 * Timer Store Query Tests
 *
 * Tests for read-only operations:
 * - Getting timer state
 * - Calculating total elapsed time (paused and running)
 * - Calculating actual start times
 *
 * All queries are pure getters with no side effects
 */

import type { TimerState } from './useTimerStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimerStore } from './useTimerStore';
import { resetTimerStoreState } from './__test-utils__/timer-store-setup';

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

describe('useTimerStore - Queries', () => {
  beforeEach(async () => {
    await resetTimerStoreState();
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
