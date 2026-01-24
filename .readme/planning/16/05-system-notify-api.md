# Phase 2b: System Notify API

## Goal

Create `notifySystem()` helper that logs notifications to IndexedDB with deduplication.

---

## Dependencies

- Phase 1a (Dexie schema) must be complete
- Phase 1b (Notification helpers) must be complete
- Phase 1c (Notification store) must be complete

---

## Files to Create

### `src/lib/notify/system.ts`

```typescript
import { useNotificationStore } from '@/stores/useNotificationStore';
import type {
  NotificationCategory,
  NotificationSeverity,
} from '@/lib/local-db/types/notifications';

export interface SystemNotifyOptions {
  userId: number;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  dedupeKey?: string;
  babyId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Log a system notification to IndexedDB.
 * This does NOT show a toast - use notifyToast for user feedback.
 *
 * @example
 * notifySystem({
 *   userId: localUser.id,
 *   category: 'sync',
 *   severity: 'warning',
 *   title: 'Sync failed',
 *   message: 'Will retry when online',
 *   dedupeKey: 'sync:pull:offline',
 * });
 */
export async function notifySystem(options: SystemNotifyOptions): Promise<void> {
  const {
    userId,
    category,
    severity,
    title,
    message,
    dedupeKey,
    babyId = null,
    entityType = null,
    entityId = null,
    metadata = null,
  } = options;

  try {
    await useNotificationStore.getState().add({
      userId,
      category,
      severity,
      title,
      message,
      source: 'background',
      dedupeKey: dedupeKey ?? null,
      babyId,
      entityType,
      entityId,
      metadata,
    });
  } catch (error) {
    // Log but don't throw - notification logging shouldn't break the app
    console.error('[notifySystem] Failed to log notification:', error);
  }
}

/**
 * Pre-built notification generators for common scenarios.
 */
export const systemNotifications = {
  syncFailed: (userId: number, reason?: string) =>
    notifySystem({
      userId,
      category: 'sync',
      severity: 'warning',
      title: 'Sync failed',
      message: reason || 'Will retry when online',
      dedupeKey: 'sync:failed',
    }),

  syncCompleted: (userId: number, count: number) =>
    notifySystem({
      userId,
      category: 'sync',
      severity: 'info',
      title: 'Sync completed',
      message: `${count} item${count === 1 ? '' : 's'} synced`,
      dedupeKey: 'sync:completed',
    }),

  accessRevoked: (userId: number, babyName: string, babyId: number) =>
    notifySystem({
      userId,
      category: 'access',
      severity: 'error',
      title: 'Access revoked',
      message: `You no longer have access to ${babyName}`,
      babyId,
      dedupeKey: `access:revoked:${babyId}`,
    }),

  conflictResolved: (
    userId: number,
    entityType: string,
    entityId: string
  ) =>
    notifySystem({
      userId,
      category: 'sync',
      severity: 'warning',
      title: 'Conflict resolved',
      message: `A ${entityType} was updated with remote changes`,
      entityType,
      entityId,
      dedupeKey: `conflict:${entityType}:${entityId}`,
    }),

  offlineDetected: (userId: number) =>
    notifySystem({
      userId,
      category: 'system',
      severity: 'warning',
      title: 'Offline',
      message: 'Changes will sync when back online',
      dedupeKey: 'offline:detected',
    }),

  onlineRestored: (userId: number) =>
    notifySystem({
      userId,
      category: 'system',
      severity: 'info',
      title: 'Back online',
      message: 'Connection restored',
      dedupeKey: 'online:restored',
    }),
};
```

### `src/lib/notify/index.ts`

```typescript
// Unified exports for notification APIs
export { notifyToast } from './toast';
export { notifySystem, systemNotifications } from './system';
```

---

## Usage Examples

### Background Sync Failure

```typescript
import { systemNotifications } from '@/lib/notify';

// In useSyncScheduler.ts
if (syncError) {
  systemNotifications.syncFailed(localUser.id, syncError.message);
  // No toast - user checks bell icon
}
```

### Access Revocation

```typescript
import { notifySystem } from '@/lib/notify';
import { notifyToast } from '@/lib/notify';

// In useAccessRevocationDetection.ts
// Keep the modal and toast (user needs immediate feedback)
// Also log for history
notifySystem({
  userId: localUser.id,
  category: 'access',
  severity: 'error',
  title: 'Access revoked',
  message: `You no longer have access to ${baby.name}`,
  babyId: baby.id,
  dedupeKey: `access:revoked:${baby.id}`,
});
```

### Custom Notification

```typescript
import { notifySystem } from '@/lib/notify';

notifySystem({
  userId: localUser.id,
  category: 'system',
  severity: 'info',
  title: 'Custom event',
  message: 'Something happened in the background',
  metadata: { customField: 'value' },
});
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Trigger a system notification via console:

```javascript
import { systemNotifications } from '@/lib/notify';
systemNotifications.syncFailed(1, 'Network error');
```

3. Check IndexedDB for the notification entry
4. Check the notification store state in React DevTools

---

## Status

⏳ Pending
