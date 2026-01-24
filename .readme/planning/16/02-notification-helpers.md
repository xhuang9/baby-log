# Phase 1b: Notification Helpers

## Goal

Create IndexedDB helper functions for CRUD operations on notifications.

---

## Dependencies

- Phase 1a (Dexie schema) must be complete

---

## Files to Create

### `src/lib/local-db/helpers/notifications.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { localDb } from '../database';
import type { LocalNotification, CreateNotificationInput } from '../types/notifications';
import {
  NOTIFICATION_RETENTION_DAYS,
  MAX_NOTIFICATIONS,
  DEDUPE_WINDOW_MS,
} from '../constants';

// ============================================
// Query Functions
// ============================================

export interface GetNotificationsOptions {
  limit?: number;
  offset?: number;
  category?: LocalNotification['category'];
  severity?: LocalNotification['severity'];
  unreadOnly?: boolean;
  babyId?: number;
}

export async function getNotifications(
  userId: number,
  options: GetNotificationsOptions = {}
): Promise<LocalNotification[]> {
  const { limit = 50, offset = 0, category, severity, unreadOnly, babyId } = options;

  let collection = localDb.notifications
    .where('userId')
    .equals(userId)
    .reverse(); // Most recent first

  // Apply filters
  let items = await collection.toArray();

  if (category) {
    items = items.filter((n) => n.category === category);
  }
  if (severity) {
    items = items.filter((n) => n.severity === severity);
  }
  if (unreadOnly) {
    items = items.filter((n) => n.readAt === null);
  }
  if (babyId !== undefined) {
    items = items.filter((n) => n.babyId === babyId);
  }

  // Sort by createdAt descending
  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Paginate
  return items.slice(offset, offset + limit);
}

export async function getUnreadCount(userId: number): Promise<number> {
  const items = await localDb.notifications
    .where('userId')
    .equals(userId)
    .filter((n) => n.readAt === null)
    .count();

  return items;
}

export async function getNotificationById(
  id: string
): Promise<LocalNotification | undefined> {
  return localDb.notifications.get(id);
}

// ============================================
// Mutation Functions
// ============================================

export async function addNotification(
  input: CreateNotificationInput
): Promise<LocalNotification> {
  const now = new Date();

  // Check for dedupe match
  if (input.dedupeKey) {
    const existing = await findDedupeMatch(input.userId, input.dedupeKey);
    if (existing) {
      // Increment count and update timestamp
      await localDb.notifications.update(existing.id, {
        count: existing.count + 1,
        createdAt: now,
        message: input.message, // Update message in case it changed
      });
      return { ...existing, count: existing.count + 1, createdAt: now };
    }
  }

  const notification: LocalNotification = {
    id: input.id ?? uuidv4(),
    userId: input.userId,
    origin: 'local',
    category: input.category,
    severity: input.severity,
    title: input.title,
    message: input.message,
    createdAt: input.createdAt ?? now,
    readAt: null,
    babyId: input.babyId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    remoteId: null,
    source: input.source,
    dedupeKey: input.dedupeKey ?? null,
    count: input.count ?? 1,
    metadata: input.metadata ?? null,
    expiresAt: null,
  };

  await localDb.notifications.add(notification);

  // Prune old notifications in background
  pruneOldNotifications(input.userId).catch(console.error);

  return notification;
}

async function findDedupeMatch(
  userId: number,
  dedupeKey: string
): Promise<LocalNotification | undefined> {
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);

  const matches = await localDb.notifications
    .where('dedupeKey')
    .equals(dedupeKey)
    .filter((n) => n.userId === userId && n.createdAt >= cutoff)
    .toArray();

  return matches[0];
}

export async function markRead(id: string): Promise<void> {
  await localDb.notifications.update(id, { readAt: new Date() });
}

export async function markAllRead(userId: number): Promise<void> {
  await localDb.notifications
    .where('userId')
    .equals(userId)
    .filter((n) => n.readAt === null)
    .modify({ readAt: new Date() });
}

export async function deleteNotification(id: string): Promise<void> {
  await localDb.notifications.delete(id);
}

// ============================================
// Maintenance Functions
// ============================================

export async function pruneOldNotifications(userId: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS);

  // Delete notifications older than retention period
  const oldItems = await localDb.notifications
    .where('userId')
    .equals(userId)
    .filter((n) => n.createdAt < cutoffDate)
    .toArray();

  const oldIds = oldItems.map((n) => n.id);

  // Also enforce max count
  const allItems = await localDb.notifications
    .where('userId')
    .equals(userId)
    .reverse()
    .sortBy('createdAt');

  const excessItems = allItems.slice(MAX_NOTIFICATIONS);
  const excessIds = excessItems.map((n) => n.id);

  const idsToDelete = [...new Set([...oldIds, ...excessIds])];

  if (idsToDelete.length > 0) {
    await localDb.notifications.bulkDelete(idsToDelete);
  }

  return idsToDelete.length;
}

export async function clearAllNotifications(userId: number): Promise<void> {
  await localDb.notifications.where('userId').equals(userId).delete();
}
```

---

## Export Updates

Update `src/lib/local-db/helpers/index.ts` (if it exists) to export notification helpers:

```typescript
export * from './notifications';
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Write a quick test in browser console:

```javascript
// In browser DevTools
import { addNotification, getNotifications, getUnreadCount } from '@/lib/local-db/helpers/notifications';

await addNotification({
  userId: 1,
  category: 'sync',
  severity: 'info',
  title: 'Test',
  message: 'Test notification',
  source: 'system',
  babyId: null,
  entityType: null,
  entityId: null,
  metadata: null,
  dedupeKey: null,
});

const items = await getNotifications(1);
console.log('Notifications:', items);

const count = await getUnreadCount(1);
console.log('Unread count:', count);
```

---

## Status

⏳ Pending
