/**
 * Notification Store
 *
 * Manages notifications with IndexedDB persistence.
 * Used to display system events, sync status, and user alerts.
 *
 * @see .readme/planning/16-notification.md
 */

import type {
  CreateNotificationInput,
  LocalNotification,
} from '@/lib/local-db/types/notifications';
import { create } from 'zustand';

type NotificationStore = {
  // State
  items: LocalNotification[];
  unreadCount: number;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  add: (notification: CreateNotificationInput) => Promise<LocalNotification | null>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;

  // Hydration
  hydrateFromIndexedDB: (userId: number) => Promise<void>;

  // Internal setters
  setItems: (items: LocalNotification[]) => void;
  setUnreadCount: (count: number) => void;
  reset: () => void;
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  isHydrated: false,

  add: async (notification) => {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const { addNotification } = await import('@/lib/local-db/helpers/notifications');
      const newNotification = await addNotification(notification);

      // Update state
      const currentItems = get().items;

      // Check if this was a dedupe update (same dedupeKey)
      if (notification.dedupeKey) {
        const existingIndex = currentItems.findIndex(
          item => item.dedupeKey === notification.dedupeKey,
        );
        if (existingIndex !== -1) {
          // Replace existing with updated notification
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = newNotification;
          set({ items: updatedItems });
          return newNotification;
        }
      }

      // Add new notification to the front
      set({
        items: [newNotification, ...currentItems],
        unreadCount: get().unreadCount + 1,
      });

      return newNotification;
    } catch (error) {
      console.error('Failed to add notification:', error);
      return null;
    }
  },

  markRead: async (id) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const { markRead } = await import('@/lib/local-db/helpers/notifications');
      await markRead(id);

      // Update state
      const currentItems = get().items;
      const itemIndex = currentItems.findIndex(item => item.id === id);

      if (itemIndex !== -1 && currentItems[itemIndex]?.readAt === null) {
        const updatedItems = [...currentItems];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex]!,
          readAt: new Date(),
        };
        set({
          items: updatedItems,
          unreadCount: Math.max(0, get().unreadCount - 1),
        });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllRead: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentItems = get().items;
    const userId = currentItems[0]?.userId;

    if (!userId) {
      return;
    }

    try {
      const { markAllRead } = await import('@/lib/local-db/helpers/notifications');
      await markAllRead(userId);

      // Update state
      const now = new Date();
      const updatedItems = currentItems.map(item => ({
        ...item,
        readAt: item.readAt ?? now,
      }));

      set({
        items: updatedItems,
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  remove: async (id) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const { deleteNotification } = await import('@/lib/local-db/helpers/notifications');
      await deleteNotification(id);

      // Update state
      const currentItems = get().items;
      const itemToRemove = currentItems.find(item => item.id === id);
      const updatedItems = currentItems.filter(item => item.id !== id);

      set({
        items: updatedItems,
        unreadCount: itemToRemove?.readAt === null
          ? Math.max(0, get().unreadCount - 1)
          : get().unreadCount,
      });
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  },

  hydrateFromIndexedDB: async (userId) => {
    if (typeof window === 'undefined') {
      return;
    }

    set({ isLoading: true });

    try {
      const { getNotifications, getUnreadCount, pruneOldNotifications } = await import(
        '@/lib/local-db/helpers/notifications',
      );

      // Prune old notifications first
      await pruneOldNotifications(userId);

      // Fetch notifications and unread count
      const [notifications, unreadCount] = await Promise.all([
        getNotifications(userId, { limit: 100 }),
        getUnreadCount(userId),
      ]);

      set({
        items: notifications,
        unreadCount,
        isLoading: false,
        isHydrated: true,
      });
    } catch (error) {
      console.error('Failed to hydrate notifications from IndexedDB:', error);
      set({ isLoading: false, isHydrated: true });
    }
  },

  setItems: (items) => {
    set({ items });
  },

  setUnreadCount: (count) => {
    set({ unreadCount: count });
  },

  reset: () => {
    set({
      items: [],
      unreadCount: 0,
      isLoading: false,
      isHydrated: false,
    });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get notifications by category
 */
export function useNotificationsByCategory(category: LocalNotification['category']) {
  return useNotificationStore(state =>
    state.items.filter(item => item.category === category),
  );
}

/**
 * Get unread notifications only
 */
export function useUnreadNotifications() {
  return useNotificationStore(state =>
    state.items.filter(item => item.readAt === null),
  );
}

/**
 * Check if there are any unread notifications
 */
export function useHasUnreadNotifications() {
  return useNotificationStore(state => state.unreadCount > 0);
}
