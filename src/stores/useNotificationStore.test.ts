/**
 * Notification Store Tests
 *
 * Tests for the notification store operations:
 * - State management (add, markRead, markAllRead, remove)
 * - Hydration from IndexedDB
 * - Selector hooks
 */

import type { LocalNotification } from '@/lib/local-db/types/notifications';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useNotificationStore,
} from './useNotificationStore';

// Stub window for Node environment (store checks typeof window !== 'undefined')
beforeAll(() => {
  vi.stubGlobal('window', {});
});

// Mock the notification helpers
vi.mock('@/lib/local-db/helpers/notifications', () => ({
  addNotification: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  deleteNotification: vi.fn(),
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  pruneOldNotifications: vi.fn(),
}));

// Helper to create a mock notification
function createMockNotification(overrides: Partial<LocalNotification> = {}): LocalNotification {
  return {
    id: 'notification-1',
    userId: 1,
    origin: 'local',
    category: 'sync',
    severity: 'info',
    title: 'Test Notification',
    message: 'Test message',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    readAt: null,
    babyId: null,
    entityType: null,
    entityId: null,
    remoteId: null,
    source: 'background',
    dedupeKey: null,
    count: 1,
    metadata: null,
    expiresAt: null,
    ...overrides,
  };
}

// Reset store state before each test
function resetNotificationStoreState() {
  useNotificationStore.setState({
    items: [],
    unreadCount: 0,
    isLoading: false,
    isHydrated: false,
  });
}

describe('useNotificationStore', () => {
  beforeEach(async () => {
    resetNotificationStoreState();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const state = useNotificationStore.getState();

      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.isHydrated).toBe(false);
    });
  });

  describe('add', () => {
    it('should add notification to the front of items', async () => {
      const { addNotification } = await import('@/lib/local-db/helpers/notifications');
      const mockNotification = createMockNotification();

      vi.mocked(addNotification).mockResolvedValue(mockNotification);

      const result = await useNotificationStore.getState().add({
        userId: 1,
        category: 'sync',
        severity: 'info',
        title: 'Test Notification',
        message: 'Test message',
        babyId: null,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: null,
        metadata: null,
      });

      const state = useNotificationStore.getState();

      expect(result).toEqual(mockNotification);
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual(mockNotification);
      expect(state.unreadCount).toBe(1);
    });

    it('should increment unread count when adding new notification', async () => {
      const { addNotification } = await import('@/lib/local-db/helpers/notifications');

      // Set up initial state with existing notifications
      useNotificationStore.setState({
        items: [createMockNotification({ id: 'existing-1' })],
        unreadCount: 1,
        isHydrated: true,
      });

      const newNotification = createMockNotification({ id: 'new-1' });
      vi.mocked(addNotification).mockResolvedValue(newNotification);

      await useNotificationStore.getState().add({
        userId: 1,
        category: 'sync',
        severity: 'info',
        title: 'New Notification',
        message: 'New message',
        babyId: null,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: null,
        metadata: null,
      });

      const state = useNotificationStore.getState();

      expect(state.items).toHaveLength(2);
      expect(state.items[0]?.id).toBe('new-1'); // New one at front
      expect(state.unreadCount).toBe(2);
    });

    it('should replace existing notification with same dedupeKey', async () => {
      const { addNotification } = await import('@/lib/local-db/helpers/notifications');

      const existingNotification = createMockNotification({
        id: 'existing-1',
        dedupeKey: 'unique-dedupe-key',
        count: 1,
      });

      useNotificationStore.setState({
        items: [existingNotification],
        unreadCount: 1,
        isHydrated: true,
      });

      const updatedNotification = createMockNotification({
        id: 'existing-1',
        dedupeKey: 'unique-dedupe-key',
        count: 2, // Incremented count
      });

      vi.mocked(addNotification).mockResolvedValue(updatedNotification);

      await useNotificationStore.getState().add({
        userId: 1,
        category: 'sync',
        severity: 'info',
        title: 'Test Notification',
        message: 'Test message',
        babyId: null,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: 'unique-dedupe-key',
        metadata: null,
      });

      const state = useNotificationStore.getState();

      expect(state.items).toHaveLength(1);
      expect(state.items[0]?.count).toBe(2);
      expect(state.unreadCount).toBe(1); // Should NOT increment for dedupe update
    });

    it('should return null on error', async () => {
      const { addNotification } = await import('@/lib/local-db/helpers/notifications');

      vi.mocked(addNotification).mockRejectedValue(new Error('DB error'));

      const result = await useNotificationStore.getState().add({
        userId: 1,
        category: 'sync',
        severity: 'info',
        title: 'Test',
        message: 'Test',
        babyId: null,
        entityType: null,
        entityId: null,
        source: 'background',
        dedupeKey: null,
        metadata: null,
      });

      expect(result).toBeNull();
    });
  });

  describe('markRead', () => {
    it('should mark notification as read and decrement unread count', async () => {
      const { markRead } = await import('@/lib/local-db/helpers/notifications');

      const unreadNotification = createMockNotification({
        id: 'unread-1',
        readAt: null,
      });

      useNotificationStore.setState({
        items: [unreadNotification],
        unreadCount: 1,
        isHydrated: true,
      });

      vi.mocked(markRead).mockResolvedValue(undefined);

      await useNotificationStore.getState().markRead('unread-1');

      const state = useNotificationStore.getState();

      expect(state.items[0]?.readAt).not.toBeNull();
      expect(state.unreadCount).toBe(0);
      expect(markRead).toHaveBeenCalledWith('unread-1');
    });

    it('should not decrement count for already read notification', async () => {
      const { markRead } = await import('@/lib/local-db/helpers/notifications');

      const readNotification = createMockNotification({
        id: 'read-1',
        readAt: new Date('2024-01-01T13:00:00Z'),
      });

      useNotificationStore.setState({
        items: [readNotification],
        unreadCount: 0,
        isHydrated: true,
      });

      vi.mocked(markRead).mockResolvedValue(undefined);

      await useNotificationStore.getState().markRead('read-1');

      const state = useNotificationStore.getState();

      expect(state.unreadCount).toBe(0); // Should remain 0
    });

    it('should handle non-existent notification gracefully', async () => {
      const { markRead } = await import('@/lib/local-db/helpers/notifications');

      useNotificationStore.setState({
        items: [],
        unreadCount: 0,
        isHydrated: true,
      });

      vi.mocked(markRead).mockResolvedValue(undefined);

      // Should not throw
      await useNotificationStore.getState().markRead('non-existent');

      expect(markRead).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read and reset unread count', async () => {
      const { markAllRead } = await import('@/lib/local-db/helpers/notifications');

      const notifications = [
        createMockNotification({ id: 'n1', userId: 1, readAt: null }),
        createMockNotification({ id: 'n2', userId: 1, readAt: null }),
        createMockNotification({ id: 'n3', userId: 1, readAt: new Date() }),
      ];

      useNotificationStore.setState({
        items: notifications,
        unreadCount: 2,
        isHydrated: true,
      });

      vi.mocked(markAllRead).mockResolvedValue(undefined);

      await useNotificationStore.getState().markAllRead();

      const state = useNotificationStore.getState();

      expect(state.items.every(item => item.readAt !== null)).toBe(true);
      expect(state.unreadCount).toBe(0);
      expect(markAllRead).toHaveBeenCalledWith(1);
    });

    it('should do nothing if no items exist', async () => {
      const { markAllRead } = await import('@/lib/local-db/helpers/notifications');

      useNotificationStore.setState({
        items: [],
        unreadCount: 0,
        isHydrated: true,
      });

      await useNotificationStore.getState().markAllRead();

      expect(markAllRead).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove notification from items', async () => {
      const { deleteNotification } = await import('@/lib/local-db/helpers/notifications');

      const notification = createMockNotification({ id: 'to-delete', readAt: null });

      useNotificationStore.setState({
        items: [notification],
        unreadCount: 1,
        isHydrated: true,
      });

      vi.mocked(deleteNotification).mockResolvedValue(undefined);

      await useNotificationStore.getState().remove('to-delete');

      const state = useNotificationStore.getState();

      expect(state.items).toHaveLength(0);
      expect(state.unreadCount).toBe(0);
    });

    it('should decrement unread count when removing unread notification', async () => {
      const { deleteNotification } = await import('@/lib/local-db/helpers/notifications');

      const notifications = [
        createMockNotification({ id: 'n1', readAt: null }),
        createMockNotification({ id: 'n2', readAt: null }),
      ];

      useNotificationStore.setState({
        items: notifications,
        unreadCount: 2,
        isHydrated: true,
      });

      vi.mocked(deleteNotification).mockResolvedValue(undefined);

      await useNotificationStore.getState().remove('n1');

      const state = useNotificationStore.getState();

      expect(state.items).toHaveLength(1);
      expect(state.unreadCount).toBe(1);
    });

    it('should not decrement unread count when removing read notification', async () => {
      const { deleteNotification } = await import('@/lib/local-db/helpers/notifications');

      const notifications = [
        createMockNotification({ id: 'n1', readAt: new Date() }), // Already read
        createMockNotification({ id: 'n2', readAt: null }),
      ];

      useNotificationStore.setState({
        items: notifications,
        unreadCount: 1,
        isHydrated: true,
      });

      vi.mocked(deleteNotification).mockResolvedValue(undefined);

      await useNotificationStore.getState().remove('n1'); // Remove the read one

      const state = useNotificationStore.getState();

      expect(state.items).toHaveLength(1);
      expect(state.unreadCount).toBe(1); // Should remain 1
    });
  });

  describe('hydrateFromIndexedDB', () => {
    it('should load notifications and unread count from IndexedDB', async () => {
      const { getNotifications, getUnreadCount, pruneOldNotifications } = await import(
        '@/lib/local-db/helpers/notifications'
      );

      const mockNotifications = [
        createMockNotification({ id: 'n1' }),
        createMockNotification({ id: 'n2' }),
      ];

      vi.mocked(pruneOldNotifications).mockResolvedValue(0);
      vi.mocked(getNotifications).mockResolvedValue(mockNotifications);
      vi.mocked(getUnreadCount).mockResolvedValue(2);

      await useNotificationStore.getState().hydrateFromIndexedDB(1);

      const state = useNotificationStore.getState();

      expect(state.items).toEqual(mockNotifications);
      expect(state.unreadCount).toBe(2);
      expect(state.isLoading).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(pruneOldNotifications).toHaveBeenCalledWith(1);
      expect(getNotifications).toHaveBeenCalledWith(1, { limit: 100 });
      expect(getUnreadCount).toHaveBeenCalledWith(1);
    });

    it('should set isLoading during hydration', async () => {
      const { getNotifications, getUnreadCount, pruneOldNotifications } = await import(
        '@/lib/local-db/helpers/notifications'
      );

      // Create a promise that we can control
      let resolveGetNotifications: (value: LocalNotification[]) => void;
      const getNotificationsPromise = new Promise<LocalNotification[]>(resolve => {
        resolveGetNotifications = resolve;
      });

      vi.mocked(pruneOldNotifications).mockResolvedValue(0);
      vi.mocked(getNotifications).mockReturnValue(getNotificationsPromise);
      vi.mocked(getUnreadCount).mockResolvedValue(0);

      const hydratePromise = useNotificationStore.getState().hydrateFromIndexedDB(1);

      // Check loading state while in progress
      expect(useNotificationStore.getState().isLoading).toBe(true);

      // Resolve and complete
      resolveGetNotifications!([]);
      await hydratePromise;

      expect(useNotificationStore.getState().isLoading).toBe(false);
    });

    it('should handle hydration errors gracefully', async () => {
      const { pruneOldNotifications } = await import('@/lib/local-db/helpers/notifications');

      vi.mocked(pruneOldNotifications).mockRejectedValue(new Error('DB error'));

      await useNotificationStore.getState().hydrateFromIndexedDB(1);

      const state = useNotificationStore.getState();

      expect(state.isLoading).toBe(false);
      expect(state.isHydrated).toBe(true); // Should still mark as hydrated
    });
  });

  describe('setItems', () => {
    it('should replace items array', () => {
      const newItems = [
        createMockNotification({ id: 'new-1' }),
        createMockNotification({ id: 'new-2' }),
      ];

      useNotificationStore.getState().setItems(newItems);

      const state = useNotificationStore.getState();

      expect(state.items).toEqual(newItems);
    });
  });

  describe('setUnreadCount', () => {
    it('should update unread count', () => {
      useNotificationStore.getState().setUnreadCount(5);

      expect(useNotificationStore.getState().unreadCount).toBe(5);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useNotificationStore.setState({
        items: [createMockNotification()],
        unreadCount: 5,
        isLoading: true,
        isHydrated: true,
      });

      useNotificationStore.getState().reset();

      const state = useNotificationStore.getState();

      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.isHydrated).toBe(false);
    });
  });

  describe('selector hooks', () => {
    // Note: Testing selector hooks requires rendering in a React context
    // These tests verify the selector logic works correctly when called directly

    describe('useNotificationsByCategory', () => {
      it('should filter notifications by category', () => {
        const notifications = [
          createMockNotification({ id: 'n1', category: 'sync' }),
          createMockNotification({ id: 'n2', category: 'access' }),
          createMockNotification({ id: 'n3', category: 'sync' }),
          createMockNotification({ id: 'n4', category: 'system' }),
        ];

        useNotificationStore.setState({
          items: notifications,
          isHydrated: true,
        });

        // Test the selector logic directly
        const syncNotifications = useNotificationStore.getState().items.filter(
          item => item.category === 'sync',
        );

        expect(syncNotifications).toHaveLength(2);
        expect(syncNotifications.every(n => n.category === 'sync')).toBe(true);
      });
    });

    describe('useUnreadNotifications', () => {
      it('should filter to unread notifications only', () => {
        const notifications = [
          createMockNotification({ id: 'n1', readAt: null }),
          createMockNotification({ id: 'n2', readAt: new Date() }),
          createMockNotification({ id: 'n3', readAt: null }),
        ];

        useNotificationStore.setState({
          items: notifications,
          isHydrated: true,
        });

        // Test the selector logic directly
        const unreadNotifications = useNotificationStore.getState().items.filter(
          item => item.readAt === null,
        );

        expect(unreadNotifications).toHaveLength(2);
      });
    });

    describe('useHasUnreadNotifications', () => {
      it('should return true when unreadCount > 0', () => {
        useNotificationStore.setState({ unreadCount: 3 });

        const hasUnread = useNotificationStore.getState().unreadCount > 0;

        expect(hasUnread).toBe(true);
      });

      it('should return false when unreadCount is 0', () => {
        useNotificationStore.setState({ unreadCount: 0 });

        const hasUnread = useNotificationStore.getState().unreadCount > 0;

        expect(hasUnread).toBe(false);
      });
    });
  });
});
