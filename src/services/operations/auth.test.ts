/**
 * Auth Operations Tests
 *
 * Unit tests for authentication-related operations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signOutCleanup } from './auth';

// Mock dependencies
vi.mock('@/lib/local-db', () => ({
  clearAllLocalData: vi.fn(),
}));

vi.mock('@/stores/useUserStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      clearUser: vi.fn(),
      user: null,
    })),
  },
}));

vi.mock('@/stores/useBabyStore', () => ({
  useBabyStore: {
    getState: vi.fn(() => ({
      clearActiveBaby: vi.fn(),
      activeBaby: null,
      allBabies: [],
    })),
  },
}));

// Mock sessionStorage
const sessionStorageMock = {
  removeItem: vi.fn(),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

describe('Auth Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signOutCleanup', () => {
    it('should clear all IndexedDB data', async () => {
      const { clearAllLocalData } = await import('@/lib/local-db');

      const result = await signOutCleanup();

      expect(clearAllLocalData).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('should clear Zustand stores', async () => {
      const { useUserStore } = await import('@/stores/useUserStore');
      const { useBabyStore } = await import('@/stores/useBabyStore');

      const clearUser = vi.fn();
      const clearActiveBaby = vi.fn();

      vi.mocked(useUserStore.getState).mockReturnValue({
        clearUser,
        user: null,
      } as any);

      vi.mocked(useBabyStore.getState).mockReturnValue({
        clearActiveBaby,
        activeBaby: null,
        allBabies: [],
      } as any);

      await signOutCleanup();

      expect(clearUser).toHaveBeenCalled();
      expect(clearActiveBaby).toHaveBeenCalled();
    });

    it('should clear sessionStorage keys', async () => {
      await signOutCleanup();

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('baby-log:init-step');
    });

    it('should succeed even if IndexedDB cleanup fails', async () => {
      const { clearAllLocalData } = await import('@/lib/local-db');

      vi.mocked(clearAllLocalData).mockRejectedValueOnce(new Error('Quota exceeded'));

      const result = await signOutCleanup();

      expect(result.success).toBe(true);
    });

    it('should return failure if Zustand clearing fails', async () => {
      const { useUserStore } = await import('@/stores/useUserStore');

      vi.mocked(useUserStore.getState).mockImplementationOnce(() => {
        throw new Error('Store unavailable');
      });

      const result = await signOutCleanup();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Store unavailable');
      }
    });
  });
});
