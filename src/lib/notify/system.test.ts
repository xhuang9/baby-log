/**
 * System Notification API Tests
 *
 * Tests for the notifySystem wrapper API:
 * - Severity-specific methods (info, warning, error)
 * - Category convenience methods (sync, access)
 * - Options transformation to CreateNotificationInput
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import after mocking
import { notifySystem } from './system';

// Mock the notification store before importing the module under test
const mockAdd = vi.fn().mockResolvedValue({
  id: 'notification-123',
  userId: 1,
  category: 'sync',
  severity: 'info',
  title: 'Test',
  message: 'Test message',
  createdAt: new Date(),
  readAt: null,
  babyId: null,
  entityType: null,
  entityId: null,
  source: 'background',
  dedupeKey: null,
  metadata: null,
});

vi.mock('@/stores/useNotificationStore', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      add: mockAdd,
    })),
  },
}));

describe('notifySystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('info', () => {
    it('should call store add with correct severity', async () => {
      await notifySystem.info({
        userId: 1,
        title: 'Info Title',
        message: 'Info message',
        category: 'sync',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
        }),
      );
    });

    it('should transform options to CreateNotificationInput', async () => {
      await notifySystem.info({
        userId: 123,
        title: 'Test Title',
        message: 'Test message',
        category: 'system',
        babyId: 456,
        entityType: 'feed',
        entityId: 'feed-789',
        dedupeKey: 'unique-key',
        metadata: { extra: 'data' },
      });

      expect(mockAdd).toHaveBeenCalledWith({
        userId: 123,
        category: 'system',
        severity: 'info',
        title: 'Test Title',
        message: 'Test message',
        babyId: 456,
        entityType: 'feed',
        entityId: 'feed-789',
        source: 'background',
        dedupeKey: 'unique-key',
        metadata: { extra: 'data' },
      });
    });

    it('should set null for optional fields when not provided', async () => {
      await notifySystem.info({
        userId: 1,
        title: 'Title',
        message: 'Message',
        category: 'sync',
      });

      expect(mockAdd).toHaveBeenCalledWith({
        userId: 1,
        category: 'sync',
        severity: 'info',
        title: 'Title',
        message: 'Message',
        babyId: null,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: null,
        metadata: null,
      });
    });
  });

  describe('warning', () => {
    it('should call store add with correct severity', async () => {
      await notifySystem.warning({
        userId: 1,
        title: 'Warning Title',
        message: 'Warning message',
        category: 'access',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
        }),
      );
    });

    it('should transform options to CreateNotificationInput', async () => {
      await notifySystem.warning({
        userId: 1,
        title: 'Access Warning',
        message: 'Your access has been modified',
        category: 'access',
        babyId: 100,
      });

      expect(mockAdd).toHaveBeenCalledWith({
        userId: 1,
        category: 'access',
        severity: 'warning',
        title: 'Access Warning',
        message: 'Your access has been modified',
        babyId: 100,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: null,
        metadata: null,
      });
    });
  });

  describe('error', () => {
    it('should call store add with correct severity', async () => {
      await notifySystem.error({
        userId: 1,
        title: 'Error Title',
        message: 'Error message',
        category: 'sync',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
        }),
      );
    });

    it('should transform options to CreateNotificationInput', async () => {
      await notifySystem.error({
        userId: 1,
        title: 'Sync Failed',
        message: 'Unable to sync data',
        category: 'sync',
        dedupeKey: 'sync-error-123',
      });

      expect(mockAdd).toHaveBeenCalledWith({
        userId: 1,
        category: 'sync',
        severity: 'error',
        title: 'Sync Failed',
        message: 'Unable to sync data',
        babyId: null,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: 'sync-error-123',
        metadata: null,
      });
    });
  });

  describe('sync convenience method', () => {
    it('should override category to "sync"', async () => {
      await notifySystem.sync('info', {
        userId: 1,
        title: 'Sync Complete',
        message: 'All data synced',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'sync',
        }),
      );
    });

    it('should pass through severity', async () => {
      await notifySystem.sync('error', {
        userId: 1,
        title: 'Sync Failed',
        message: 'Could not sync',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          category: 'sync',
        }),
      );
    });

    it('should work with all severity levels', async () => {
      await notifySystem.sync('info', {
        userId: 1,
        title: 'Info',
        message: 'Info sync',
      });

      expect(mockAdd).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'info', category: 'sync' }),
      );

      await notifySystem.sync('warning', {
        userId: 1,
        title: 'Warning',
        message: 'Warning sync',
      });

      expect(mockAdd).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'warning', category: 'sync' }),
      );

      await notifySystem.sync('error', {
        userId: 1,
        title: 'Error',
        message: 'Error sync',
      });

      expect(mockAdd).toHaveBeenLastCalledWith(
        expect.objectContaining({ severity: 'error', category: 'sync' }),
      );
    });
  });

  describe('access convenience method', () => {
    it('should override category to "access"', async () => {
      await notifySystem.access('warning', {
        userId: 1,
        title: 'Access Changed',
        message: 'Your access was modified',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'access',
        }),
      );
    });

    it('should pass through severity', async () => {
      await notifySystem.access('error', {
        userId: 1,
        title: 'Access Revoked',
        message: 'Access was removed',
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          category: 'access',
        }),
      );
    });

    it('should include babyId and other options', async () => {
      await notifySystem.access('warning', {
        userId: 1,
        title: 'Access Revoked',
        message: 'Your access to Baby has been removed',
        babyId: 789,
        dedupeKey: 'access-revoked-789',
      });

      expect(mockAdd).toHaveBeenCalledWith({
        userId: 1,
        category: 'access',
        severity: 'warning',
        title: 'Access Revoked',
        message: 'Your access to Baby has been removed',
        babyId: 789,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: 'access-revoked-789',
        metadata: null,
      });
    });
  });

  describe('return value', () => {
    it('should return the notification from store add', async () => {
      const result = await notifySystem.info({
        userId: 1,
        title: 'Test',
        message: 'Test',
        category: 'sync',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'notification-123',
        }),
      );
    });
  });
});
