/**
 * Timer Store Hydration Tests
 *
 * Tests for lifecycle and persistence operations:
 * - Loading timers from IndexedDB
 * - Handling missing or corrupt data
 * - Error recovery during hydration
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

describe('useTimerStore - Hydration', () => {
  beforeEach(async () => {
    await resetTimerStoreState();
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
});
