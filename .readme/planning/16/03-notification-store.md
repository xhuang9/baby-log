# Phase 1c: Notification Store

## Goal

Create a Zustand store for notification state management with IndexedDB sync.

---

## Dependencies

- Phase 1a (Dexie schema) must be complete
- Phase 1b (Notification helpers) must be complete

---

## Files to Create

### `src/stores/useNotificationStore.ts`

```typescript
import { create } from 'zustand';
import type { LocalNotification, CreateNotificationInput } from '@/lib/local-db/types/notifications';
import {
  getNotifications,
  getUnreadCount,
  addNotification as addNotificationToDb,
  markRead as markReadInDb,
  markAllRead as markAllReadInDb,
  deleteNotification as deleteNotificationFromDb,
} from '@/lib/local-db/helpers/notifications';

interface NotificationState {
  // Data
  items: LocalNotification[];
  unreadCount: number;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  hydrate: (userId: number) => Promise<void>;
  add: (input: CreateNotificationInput) => Promise<LocalNotification>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: (userId: number) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  items: [],
  unreadCount: 0,
  isLoading: false,
  isHydrated: false,

  // Hydrate from IndexedDB
  hydrate: async (userId: number) => {
    if (get().isLoading) return;

    set({ isLoading: true });

    try {
      const [items, unreadCount] = await Promise.all([
        getNotifications(userId, { limit: 100 }),
        getUnreadCount(userId),
      ]);

      set({
        items,
        unreadCount,
        isHydrated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[NotificationStore] Hydration failed:', error);
      set({ isLoading: false });
    }
  },

  // Add a new notification
  add: async (input: CreateNotificationInput) => {
    const notification = await addNotificationToDb(input);

    set((state) => ({
      items: [notification, ...state.items].slice(0, 100), // Keep max 100 in memory
      unreadCount: state.unreadCount + 1,
    }));

    return notification;
  },

  // Mark single notification as read
  markRead: async (id: string) => {
    await markReadInDb(id);

    set((state) => ({
      items: state.items.map((n) =>
        n.id === id ? { ...n, readAt: new Date() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  // Mark all as read
  markAllRead: async (userId: number) => {
    await markAllReadInDb(userId);

    set((state) => ({
      items: state.items.map((n) => ({ ...n, readAt: new Date() })),
      unreadCount: 0,
    }));
  },

  // Remove a notification
  remove: async (id: string) => {
    const item = get().items.find((n) => n.id === id);
    await deleteNotificationFromDb(id);

    set((state) => ({
      items: state.items.filter((n) => n.id !== id),
      unreadCount: item?.readAt === null
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
  },

  // Refresh from DB (useful after returning to tab)
  refresh: async (userId: number) => {
    const [items, unreadCount] = await Promise.all([
      getNotifications(userId, { limit: 100 }),
      getUnreadCount(userId),
    ]);

    set({ items, unreadCount });
  },

  // Reset store (for logout)
  reset: () => {
    set({
      items: [],
      unreadCount: 0,
      isLoading: false,
      isHydrated: false,
    });
  },
}));
```

---

## Integration Hook (Optional)

Create a hook for easy component integration:

### `src/hooks/useNotifications.ts`

```typescript
import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useLocalUser } from '@/hooks/useLocalUser';

export function useNotifications() {
  const store = useNotificationStore();
  const { localUser } = useLocalUser();

  // Hydrate on mount if we have a user
  useEffect(() => {
    if (localUser?.id && !store.isHydrated) {
      store.hydrate(localUser.id);
    }
  }, [localUser?.id, store.isHydrated]);

  return {
    items: store.items,
    unreadCount: store.unreadCount,
    isLoading: store.isLoading,
    markRead: store.markRead,
    markAllRead: () => localUser?.id && store.markAllRead(localUser.id),
    refresh: () => localUser?.id && store.refresh(localUser.id),
  };
}
```

---

## Hydration Point

Add hydration to the app bootstrap. In `src/components/AppBootstrap.tsx` or similar:

```typescript
import { useNotificationStore } from '@/stores/useNotificationStore';

// Inside the component that runs after auth:
useEffect(() => {
  if (localUser?.id) {
    useNotificationStore.getState().hydrate(localUser.id);
  }
}, [localUser?.id]);
```

---

## Logout Integration

Update logout flow to reset notification store:

```typescript
// In LogoutContext.tsx or signOutCleanup
import { useNotificationStore } from '@/stores/useNotificationStore';

// During cleanup:
useNotificationStore.getState().reset();
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Log in to the app
3. Check that store hydrates (add console.log in hydrate function)
4. Use React DevTools to inspect Zustand store state
5. Log out and verify store resets

---

## Status

⏳ Pending
