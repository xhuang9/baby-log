/**
 * Unit Tests for Sync Service
 *
 * @see src/services/sync-service.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock local-db helpers
vi.mock('@/lib/local-db', () => ({
  getSyncCursor: vi.fn(),
  updateSyncCursor: vi.fn(),
  getPendingOutboxEntries: vi.fn(),
  updateOutboxStatus: vi.fn(),
  clearSyncedOutboxEntries: vi.fn(),
  saveFeedLogs: vi.fn(),
  saveSleepLogs: vi.fn(),
  saveNappyLogs: vi.fn(),
  deleteFeedLog: vi.fn(),
  deleteSleepLog: vi.fn(),
  deleteNappyLog: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('sync-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('pullChanges', () => {
    it('should fetch and apply changes successfully', async () => {
      const {
        getSyncCursor,
        updateSyncCursor,
        saveFeedLogs,
      } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              type: 'feed_log',
              op: 'create',
              id: 101,
              data: {
                id: '101',
                babyId: 1,
                loggedByUserId: 1,
                method: 'bottle',
                startedAt: '2024-01-01T10:00:00Z',
                endedAt: null,
                durationMinutes: null,
                amountMl: 120,
                isEstimated: false,
                endSide: null,
                notes: null,
                createdAt: '2024-01-01T10:00:00Z',
                updatedAt: '2024-01-01T10:00:00Z',
              },
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
          nextCursor: 1,
          hasMore: false,
        }),
      });

      const result = await pullChanges(1);

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(1);
      expect(vi.mocked(saveFeedLogs)).toHaveBeenCalled();
      expect(vi.mocked(updateSyncCursor)).toHaveBeenCalledWith(1, 1);
    });

    it('should handle delete operations', async () => {
      const { getSyncCursor, deleteFeedLog } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              type: 'feed_log',
              op: 'delete',
              id: 101,
              data: null,
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
          nextCursor: 1,
          hasMore: false,
        }),
      });

      const result = await pullChanges(1);

      expect(result.success).toBe(true);
      expect(vi.mocked(deleteFeedLog)).toHaveBeenCalledWith('101');
    });

    it('should recursively pull when hasMore is true', async () => {
      const { getSyncCursor } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);

      let fetchCallCount = 0;
      mockFetch.mockImplementation(async () => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return {
            ok: true,
            json: async () => ({
              changes: [{ type: 'feed_log', op: 'create', id: 1, data: createFeedLogData(1), createdAt: new Date().toISOString() }],
              nextCursor: 1,
              hasMore: true,
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            changes: [{ type: 'feed_log', op: 'create', id: 2, data: createFeedLogData(2), createdAt: new Date().toISOString() }],
            nextCursor: 2,
            hasMore: false,
          }),
        };
      });

      const result = await pullChanges(1);

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(2);
      expect(fetchCallCount).toBe(2);
    });

    it('should return error on fetch failure', async () => {
      const { getSyncCursor } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Server error',
      });

      const result = await pullChanges(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to pull changes');
    });

    it('should handle network errors', async () => {
      const { getSyncCursor } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await pullChanges(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should apply sleep_log changes', async () => {
      const { getSyncCursor, saveSleepLogs } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              type: 'sleep_log',
              op: 'create',
              id: 201,
              data: {
                id: '201',
                babyId: 1,
                loggedByUserId: 1,
                startedAt: '2024-01-01T22:00:00Z',
                endedAt: '2024-01-02T06:00:00Z',
                durationMinutes: 480,
                notes: null,
                createdAt: '2024-01-01T22:00:00Z',
                updatedAt: '2024-01-02T06:00:00Z',
              },
              createdAt: '2024-01-02T06:00:00Z',
            },
          ],
          nextCursor: 1,
          hasMore: false,
        }),
      });

      const result = await pullChanges(1);

      expect(result.success).toBe(true);
      expect(vi.mocked(saveSleepLogs)).toHaveBeenCalled();
    });

    it('should apply nappy_log changes', async () => {
      const { getSyncCursor, saveNappyLogs } = await import('@/lib/local-db');
      const { pullChanges } = await import('./sync');

      vi.mocked(getSyncCursor).mockResolvedValue(0);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              type: 'nappy_log',
              op: 'create',
              id: 301,
              data: {
                id: '301',
                babyId: 1,
                loggedByUserId: 1,
                type: 'wet',
                startedAt: '2024-01-01T08:00:00Z',
                notes: null,
                createdAt: '2024-01-01T08:00:00Z',
                updatedAt: '2024-01-01T08:00:00Z',
              },
              createdAt: '2024-01-01T08:00:00Z',
            },
          ],
          nextCursor: 1,
          hasMore: false,
        }),
      });

      const result = await pullChanges(1);

      expect(result.success).toBe(true);
      expect(vi.mocked(saveNappyLogs)).toHaveBeenCalled();
    });
  });

  describe('flushOutbox', () => {
    it('should return success with 0 changes when outbox is empty', async () => {
      const { getPendingOutboxEntries } = await import('@/lib/local-db');
      const { flushOutbox } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([]);

      const result = await flushOutbox();

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should push pending mutations and mark as synced', async () => {
      const {
        getPendingOutboxEntries,
        updateOutboxStatus,
        clearSyncedOutboxEntries,
      } = await import('@/lib/local-db');
      const { flushOutbox } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '1',
          op: 'create',
          payload: { babyId: 1, method: 'bottle', startedAt: new Date().toISOString() },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ mutationId: 'mut_1', status: 'success' }],
          newCursor: 10,
        }),
      });

      const result = await flushOutbox();

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(1);
      expect(vi.mocked(updateOutboxStatus)).toHaveBeenCalledWith('mut_1', 'syncing');
      expect(vi.mocked(updateOutboxStatus)).toHaveBeenCalledWith('mut_1', 'synced');
      expect(vi.mocked(clearSyncedOutboxEntries)).toHaveBeenCalled();
    });

    it('should handle conflict resolution with server data', async () => {
      const {
        getPendingOutboxEntries,
        updateOutboxStatus,
        saveFeedLogs,
      } = await import('@/lib/local-db');
      const { flushOutbox } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '101',
          op: 'update',
          payload: { babyId: 1, method: 'bottle', amountMl: 150 },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{
            mutationId: 'mut_1',
            status: 'conflict',
            serverData: {
              id: '101',
              babyId: 1,
              loggedByUserId: 1,
              method: 'bottle',
              startedAt: '2024-01-01T10:00:00Z',
              endedAt: null,
              durationMinutes: null,
              amountMl: 100, // Server value
              isEstimated: false,
              endSide: null,
              notes: null,
              createdAt: '2024-01-01T10:00:00Z',
              updatedAt: '2024-01-01T11:00:00Z',
            },
          }],
          newCursor: 10,
        }),
      });

      const result = await flushOutbox();

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(1);
      expect(vi.mocked(saveFeedLogs)).toHaveBeenCalled();
      expect(vi.mocked(updateOutboxStatus)).toHaveBeenCalledWith('mut_1', 'synced');
    });

    it('should mark failed mutations appropriately', async () => {
      const { getPendingOutboxEntries, updateOutboxStatus } = await import('@/lib/local-db');
      const { flushOutbox } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '1',
          op: 'create',
          payload: { babyId: 1 },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{
            mutationId: 'mut_1',
            status: 'error',
            error: 'Invalid data',
          }],
          newCursor: null,
        }),
      });

      const result = await flushOutbox();

      expect(result.success).toBe(true);
      expect(vi.mocked(updateOutboxStatus)).toHaveBeenCalledWith(
        'mut_1',
        'failed',
        'Invalid data',
      );
    });

    it('should revert to pending on network failure', async () => {
      const { getPendingOutboxEntries, updateOutboxStatus } = await import('@/lib/local-db');
      const { flushOutbox } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '1',
          op: 'create',
          payload: { babyId: 1 },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
      ]);

      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Server error',
      });

      const result = await flushOutbox();

      expect(result.success).toBe(false);
      expect(vi.mocked(updateOutboxStatus)).toHaveBeenCalledWith('mut_1', 'syncing');
      expect(vi.mocked(updateOutboxStatus)).toHaveBeenCalledWith('mut_1', 'pending');
    });

    it('should process multiple mutations', async () => {
      const { getPendingOutboxEntries } = await import('@/lib/local-db');
      const { flushOutbox } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '1',
          op: 'create',
          payload: { babyId: 1 },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
        {
          mutationId: 'mut_2',
          entityType: 'sleep_log',
          entityId: '2',
          op: 'create',
          payload: { babyId: 1 },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
      ]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { mutationId: 'mut_1', status: 'success' },
            { mutationId: 'mut_2', status: 'success' },
          ],
          newCursor: 20,
        }),
      });

      const result = await flushOutbox();

      expect(result.success).toBe(true);
      expect(result.changesApplied).toBe(2);
    });
  });

  describe('performFullSync', () => {
    it('should flush outbox and pull changes for all babies', async () => {
      const { getSyncCursor, getPendingOutboxEntries } = await import('@/lib/local-db');
      const { performFullSync } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([]);
      vi.mocked(getSyncCursor).mockResolvedValue(0);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [],
          nextCursor: 0,
          hasMore: false,
        }),
      });

      const result = await performFullSync([1, 2]);

      expect(result.success).toBe(true);
      // Should have pulled for each baby
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should continue pull even if flush fails', async () => {
      const { getSyncCursor, getPendingOutboxEntries } = await import('@/lib/local-db');
      const { performFullSync } = await import('./sync');

      vi.mocked(getPendingOutboxEntries).mockResolvedValue([
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '1',
          op: 'create',
          payload: { babyId: 1 },
          createdAt: new Date(),
          status: 'pending',
          lastAttemptAt: null,
          errorMessage: null,
        },
      ]);
      vi.mocked(getSyncCursor).mockResolvedValue(0);

      let fetchCallCount = 0;
      mockFetch.mockImplementation(async (url: string) => {
        fetchCallCount++;
        if (url.includes('/push')) {
          return { ok: false, text: async () => 'Push failed' };
        }
        return {
          ok: true,
          json: async () => ({
            changes: [],
            nextCursor: 0,
            hasMore: false,
          }),
        };
      });

      const result = await performFullSync([1]);

      expect(result.success).toBe(true);
      // Push failed but pull should still happen
      expect(fetchCallCount).toBe(2);
    });
  });

  describe('applyServerData', () => {
    it('should apply feed_log server data', async () => {
      const { saveFeedLogs } = await import('@/lib/local-db');
      const { applyServerData } = await import('./sync');

      await applyServerData({
        id: '101',
        babyId: 1,
        loggedByUserId: 1,
        method: 'bottle',
        startedAt: '2024-01-01T10:00:00Z',
        endedAt: null,
        durationMinutes: null,
        amountMl: 120,
        isEstimated: false,
        endSide: null,
        notes: null,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      });

      expect(vi.mocked(saveFeedLogs)).toHaveBeenCalled();
    });

    it('should apply sleep_log server data', async () => {
      const { saveSleepLogs } = await import('@/lib/local-db');
      const { applyServerData } = await import('./sync');

      await applyServerData({
        id: '201',
        babyId: 1,
        loggedByUserId: 1,
        startedAt: '2024-01-01T22:00:00Z',
        endedAt: '2024-01-02T06:00:00Z',
        durationMinutes: 480,
        notes: null,
        createdAt: '2024-01-01T22:00:00Z',
        updatedAt: '2024-01-02T06:00:00Z',
      });

      expect(vi.mocked(saveSleepLogs)).toHaveBeenCalled();
    });

    it('should apply nappy_log server data', async () => {
      const { saveNappyLogs } = await import('@/lib/local-db');
      const { applyServerData } = await import('./sync');

      await applyServerData({
        id: '301',
        babyId: 1,
        loggedByUserId: 1,
        type: 'wet',
        startedAt: '2024-01-01T08:00:00Z',
        notes: null,
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-01T08:00:00Z',
      });

      expect(vi.mocked(saveNappyLogs)).toHaveBeenCalled();
    });
  });
});

// Helper function to create feed log data
function createFeedLogData(id: number) {
  return {
    id: String(id),
    babyId: 1,
    loggedByUserId: 1,
    method: 'bottle',
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMinutes: null,
    amountMl: 120,
    isEstimated: false,
    endSide: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
