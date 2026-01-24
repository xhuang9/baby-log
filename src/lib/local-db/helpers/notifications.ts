/**
 * Notification Helper Functions
 *
 * Functions for managing notifications in IndexedDB.
 */

import type { CreateNotificationInput, LocalNotification } from '../types/notifications';
import { DEDUPE_WINDOW_MS, MAX_NOTIFICATIONS, NOTIFICATION_RETENTION_DAYS } from '../constants';
import { localDb } from '../database';

export type GetNotificationsOptions = {
  limit?: number;
  offset?: number;
  category?: LocalNotification['category'];
  unreadOnly?: boolean;
};

/**
 * Get notifications for a user with pagination and filters
 */
export async function getNotifications(
  userId: number,
  options: GetNotificationsOptions = {},
): Promise<LocalNotification[]> {
  const { limit = 50, offset = 0, category, unreadOnly } = options;

  let collection = localDb.notifications
    .where('userId')
    .equals(userId);

  // Apply filters
  if (category || unreadOnly) {
    collection = collection.filter((notification) => {
      if (category && notification.category !== category) {
        return false;
      }
      if (unreadOnly && notification.readAt !== null) {
        return false;
      }
      return true;
    });
  }

  // Sort by createdAt descending, apply pagination
  const results = await collection
    .reverse()
    .offset(offset)
    .limit(limit)
    .sortBy('createdAt');

  // Reverse again since sortBy returns ascending
  return results.reverse();
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  return localDb.notifications
    .where('userId')
    .equals(userId)
    .filter(notification => notification.readAt === null)
    .count();
}

/**
 * Add a notification with dedupe logic
 *
 * If a notification with the same dedupeKey exists within the dedupe window,
 * increment its count instead of creating a new entry.
 */
export async function addNotification(input: CreateNotificationInput): Promise<LocalNotification> {
  const now = new Date();
  const id = input.id ?? crypto.randomUUID();

  // Check for existing notification with same dedupeKey within window
  if (input.dedupeKey) {
    const windowStart = new Date(now.getTime() - DEDUPE_WINDOW_MS);

    const existing = await localDb.notifications
      .where('dedupeKey')
      .equals(input.dedupeKey)
      .filter(n => n.userId === input.userId && n.createdAt >= windowStart)
      .first();

    if (existing) {
      // Increment count on existing notification
      await localDb.notifications.update(existing.id, {
        count: existing.count + 1,
        createdAt: now, // Update timestamp to latest occurrence
      });

      return { ...existing, count: existing.count + 1, createdAt: now };
    }
  }

  const notification: LocalNotification = {
    id,
    userId: input.userId,
    origin: 'local',
    category: input.category,
    severity: input.severity,
    title: input.title,
    message: input.message,
    createdAt: input.createdAt ?? now,
    readAt: null,
    babyId: input.babyId,
    entityType: input.entityType,
    entityId: input.entityId,
    remoteId: null,
    source: input.source,
    dedupeKey: input.dedupeKey,
    count: input.count ?? 1,
    metadata: input.metadata,
    expiresAt: null,
  };

  await localDb.notifications.add(notification);

  return notification;
}

/**
 * Mark a single notification as read
 */
export async function markRead(id: string): Promise<void> {
  await localDb.notifications.update(id, {
    readAt: new Date(),
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllRead(userId: number): Promise<void> {
  const now = new Date();

  await localDb.notifications
    .where('userId')
    .equals(userId)
    .filter(notification => notification.readAt === null)
    .modify({ readAt: now });
}

/**
 * Prune old notifications based on retention policy
 *
 * Removes notifications older than NOTIFICATION_RETENTION_DAYS
 * and keeps only MAX_NOTIFICATIONS per user.
 */
export async function pruneOldNotifications(userId: number): Promise<number> {
  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - NOTIFICATION_RETENTION_DAYS);

  // Delete notifications older than retention period
  const expiredCount = await localDb.notifications
    .where('userId')
    .equals(userId)
    .filter(notification => notification.createdAt < retentionCutoff)
    .delete();

  // Check if we exceed max notifications
  const totalCount = await localDb.notifications
    .where('userId')
    .equals(userId)
    .count();

  let excessCount = 0;
  if (totalCount > MAX_NOTIFICATIONS) {
    // Get oldest notifications to delete
    const excess = totalCount - MAX_NOTIFICATIONS;
    const oldestNotifications = await localDb.notifications
      .where('userId')
      .equals(userId)
      .sortBy('createdAt');

    const idsToDelete = oldestNotifications.slice(0, excess).map(n => n.id);
    excessCount = await localDb.notifications
      .where('id')
      .anyOf(idsToDelete)
      .delete();
  }

  return expiredCount + excessCount;
}

/**
 * Delete a single notification
 */
export async function deleteNotification(id: string): Promise<void> {
  await localDb.notifications.delete(id);
}

/**
 * Get a single notification by ID
 */
export async function getNotification(id: string): Promise<LocalNotification | undefined> {
  return localDb.notifications.get(id);
}
