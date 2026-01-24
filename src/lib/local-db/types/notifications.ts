/**
 * Notification Types for Local Database
 *
 * Types for the local notification system that stores
 * system events, sync status, and user alerts.
 */

export type NotificationOrigin = 'local' | 'remote';
export type NotificationCategory = 'sync' | 'access' | 'system' | 'error';
export type NotificationSeverity = 'info' | 'warning' | 'error';

export type LocalNotification = {
  id: string;
  userId: number;
  origin: NotificationOrigin;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: Date;
  readAt: Date | null;
  babyId: number | null;
  entityType: string | null;
  entityId: string | null;
  remoteId: string | null;
  source: 'background' | 'system';
  dedupeKey: string | null;
  count: number;
  metadata: Record<string, unknown> | null;
  expiresAt: Date | null;
};

export type CreateNotificationInput = Omit<
  LocalNotification,
  'id' | 'createdAt' | 'readAt' | 'count' | 'origin' | 'remoteId' | 'expiresAt'
> & {
  id?: string;
  createdAt?: Date;
  count?: number;
};
