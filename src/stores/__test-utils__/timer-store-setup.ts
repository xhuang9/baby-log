/**
 * Shared test utilities for timer store tests
 *
 * Provides common beforeEach setup logic used across all timer store test files
 */

import { vi } from 'vitest';
import { useTimerStore } from '../useTimerStore';

/**
 * Resets store state and user store mocks before each test
 * Note: Mocks must be declared at module level in each test file
 */
export async function resetTimerStoreState() {
  vi.clearAllMocks();

  // Reset store state
  useTimerStore.setState({
    timers: {},
    isHydrated: false,
  });

  // Reset user store to default authenticated state
  const { useUserStore } = await import('../useUserStore');
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
}
