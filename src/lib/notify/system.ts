/**
 * System Notification API
 *
 * Logs system events to IndexedDB for the notifications page.
 * Use this for background events (sync, access changes) that
 * don't require immediate user attention via toast.
 *
 * @example
 * import { notifySystem } from '@/lib/notify';
 *
 * // Log a sync error
 * notifySystem.error({
 *   userId: 123,
 *   title: 'Sync Failed',
 *   message: 'Unable to sync changes',
 *   category: 'sync',
 *   babyId: 456,
 * });
 *
 * // Log access revocation with dedupe
 * notifySystem.warning({
 *   userId: 123,
 *   title: 'Access Revoked',
 *   message: 'Your access to Baby was removed',
 *   category: 'access',
 *   babyId: 456,
 *   dedupeKey: 'access-revoked-456',
 * });
 *
 * @see .readme/planning/16-notification.md
 */

import type {
  CreateNotificationInput,
  LocalNotification,
  NotificationCategory,
} from '@/lib/local-db/types/notifications';
import { useNotificationStore } from '@/stores/useNotificationStore';

export type SystemNotificationOptions = {
  userId: number;
  title: string;
  message: string;
  category: NotificationCategory;
  babyId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Add a system notification to the store and IndexedDB
 */
async function addSystemNotification(
  severity: LocalNotification['severity'],
  options: SystemNotificationOptions,
): Promise<LocalNotification | null> {
  const input: CreateNotificationInput = {
    userId: options.userId,
    category: options.category,
    severity,
    title: options.title,
    message: options.message,
    babyId: options.babyId ?? null,
    entityType: options.entityType ?? null,
    entityId: options.entityId ?? null,
    source: 'background',
    dedupeKey: options.dedupeKey ?? null,
    metadata: options.metadata ?? null,
  };

  return useNotificationStore.getState().add(input);
}

/**
 * System notification API
 */
export const notifySystem = {
  /**
   * Log an info-level system notification
   */
  info: (options: SystemNotificationOptions) => {
    return addSystemNotification('info', options);
  },

  /**
   * Log a warning-level system notification
   */
  warning: (options: SystemNotificationOptions) => {
    return addSystemNotification('warning', options);
  },

  /**
   * Log an error-level system notification
   */
  error: (options: SystemNotificationOptions) => {
    return addSystemNotification('error', options);
  },

  /**
   * Log a sync-related notification (convenience method)
   */
  sync: (
    severity: LocalNotification['severity'],
    options: Omit<SystemNotificationOptions, 'category'>,
  ) => {
    return addSystemNotification(severity, { ...options, category: 'sync' });
  },

  /**
   * Log an access-related notification (convenience method)
   */
  access: (
    severity: LocalNotification['severity'],
    options: Omit<SystemNotificationOptions, 'category'>,
  ) => {
    return addSystemNotification(severity, { ...options, category: 'access' });
  },
};

export type { SystemNotificationOptions as NotifySystemOptions };
