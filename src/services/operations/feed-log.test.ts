/**
 * Feed Log Operations Tests
 *
 * Unit tests for feed log creation operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LocalBabyAccess } from '@/lib/local-db';
import { createFeedLog } from './feed-log';

// Mock dependencies
vi.mock('@/lib/local-db', () => ({
  localDb: {
    babyAccess: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
        })),
      })),
    },
  },
  addToOutbox: vi.fn(),
  saveFeedLogs: vi.fn(),
}));

vi.mock('@/services/sync-service', () => ({
  flushOutbox: vi.fn(),
}));

vi.mock('@/stores/useUserStore', () => ({
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

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'feed-log-uuid-5678'),
});

describe('Feed Log Operations', () => {
  const mockAccess: LocalBabyAccess = {
    userId: 1,
    babyId: 1,
    accessLevel: 'owner',
    caregiverLabel: 'Parent',
    lastAccessedAt: new Date(),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset user store to default authenticated state
    const { useUserStore } = await import('@/stores/useUserStore');
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

  describe('createFeedLog', () => {
    it('should create a bottle feed log successfully', async () => {
      const { localDb, saveFeedLogs, addToOutbox } = await import('@/lib/local-db');
      const { flushOutbox } = await import('@/services/sync-service');

      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
        })),
      } as never);

      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        amountMl: 120,
        isEstimated: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe('bottle');
        expect(result.data.amountMl).toBe(120);
        expect(result.data.isEstimated).toBe(false);
        expect(result.data.id).toBe('feed-log-uuid-5678');
      }

      // Verify IndexedDB save
      expect(saveFeedLogs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'feed-log-uuid-5678',
            babyId: 1,
            method: 'bottle',
            amountMl: 120,
            isEstimated: false,
            loggedByUserId: 1,
          }),
        ])
      );

      // Verify outbox enqueue
      expect(addToOutbox).toHaveBeenCalledWith(
        expect.objectContaining({
          mutationId: 'feed-log-uuid-5678',
          entityType: 'feed_log',
          entityId: 'feed-log-uuid-5678',
          op: 'create',
          payload: expect.objectContaining({
            method: 'bottle',
            amountMl: 120,
          }),
        })
      );

      // Verify sync trigger
      expect(flushOutbox).toHaveBeenCalled();
    });

    it('should create a breast feed log successfully', async () => {
      const { localDb, saveFeedLogs } = await import('@/lib/local-db');

      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
        })),
      } as never);

      const startTime = new Date('2024-01-15T10:00:00Z');
      const result = await createFeedLog({
        babyId: 1,
        method: 'breast',
        startedAt: startTime,
        durationMinutes: 20,
        endSide: 'left',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe('breast');
        expect(result.data.durationMinutes).toBe(20);
        expect(result.data.endSide).toBe('left');

        // Verify endedAt is calculated correctly (startTime + 20 minutes)
        const expectedEndTime = new Date(startTime.getTime() + 20 * 60 * 1000);
        expect(result.data.endedAt).toEqual(expectedEndTime);
      }

      // Verify IndexedDB save
      expect(saveFeedLogs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'breast',
            durationMinutes: 20,
            endSide: 'left',
          }),
        ])
      );
    });

    it('should fail if babyId is missing', async () => {
      const result = await createFeedLog({
        babyId: 0,
        method: 'bottle',
        startedAt: new Date(),
        amountMl: 120,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Baby ID is required');
      }
    });

    it('should fail if method is missing', async () => {
      const result = await createFeedLog({
        babyId: 1,
        method: '' as never,
        startedAt: new Date(),
        amountMl: 120,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Feed method is required');
      }
    });

    it('should fail if startedAt is missing', async () => {
      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: null as never,
        amountMl: 120,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Start time is required');
      }
    });

    it('should fail if bottle feed has no amount', async () => {
      const { localDb } = await import('@/lib/local-db');
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
        })),
      } as never);

      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: new Date(),
        // Missing amountMl
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Amount is required for bottle feeds');
      }
    });

    it('should fail if breast feed has no duration', async () => {
      const { localDb } = await import('@/lib/local-db');
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
        })),
      } as never);

      const result = await createFeedLog({
        babyId: 1,
        method: 'breast',
        startedAt: new Date(),
        // Missing durationMinutes
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Duration is required for breast feeds');
      }
    });

    it('should fail if user is not authenticated', async () => {
      const { useUserStore } = await import('@/stores/useUserStore');
      vi.mocked(useUserStore.getState).mockReturnValue({
        user: null,
        isHydrated: true,
        setUser: vi.fn(),
        clearUser: vi.fn(),
        hydrate: vi.fn(),
        hydrateFromIndexedDB: vi.fn(),
      });

      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: new Date(),
        amountMl: 120,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Not authenticated');
      }
    });

    it('should fail if user does not have access to baby', async () => {
      const { localDb } = await import('@/lib/local-db');
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(undefined),
        })),
      } as never);

      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: new Date(),
        amountMl: 120,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Access denied');
      }
    });

    it('should fail if user has viewer access', async () => {
      const { localDb } = await import('@/lib/local-db');
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            ...mockAccess,
            accessLevel: 'viewer',
          }),
        })),
      } as never);

      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: new Date(),
        amountMl: 120,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Access denied');
      }
    });

    it('should include notes if provided', async () => {
      const { localDb, saveFeedLogs } = await import('@/lib/local-db');
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
        })),
      } as never);

      const result = await createFeedLog({
        babyId: 1,
        method: 'bottle',
        startedAt: new Date(),
        amountMl: 120,
        notes: 'Baby seemed hungry',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Baby seemed hungry');
      }

      expect(saveFeedLogs).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            notes: 'Baby seemed hungry',
          }),
        ])
      );
    });
  });
});
