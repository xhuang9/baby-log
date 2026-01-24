# Phase 1a: Dexie Schema

## Goal

Add `notifications` table to the Dexie database with proper indexes and TypeScript types.

---

## Files to Create

### `src/lib/local-db/types/notifications.ts`

```typescript
export type NotificationOrigin = 'local' | 'remote';
export type NotificationCategory = 'sync' | 'access' | 'system' | 'error';
export type NotificationSeverity = 'info' | 'warning' | 'error';

export interface LocalNotification {
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
}

export type CreateNotificationInput = Omit<
  LocalNotification,
  'id' | 'createdAt' | 'readAt' | 'count' | 'origin' | 'remoteId' | 'expiresAt'
> & {
  id?: string;
  createdAt?: Date;
  count?: number;
};
```

---

## Files to Modify

### `src/lib/local-db/database.ts`

Add version(2) with notifications table:

```typescript
// Add import
import type { LocalNotification } from './types/notifications';

// Update class declaration to include notifications
export class BabyLogDatabase extends Dexie {
  users!: Table<LocalUser>;
  babies!: Table<LocalBaby>;
  feeds!: Table<LocalFeed>;
  pendingOperations!: Table<PendingOperation>;
  notifications!: Table<LocalNotification>; // Add this

  constructor() {
    super('BabyLogDatabase');

    // Existing version(1) - keep unchanged
    this.version(1).stores({
      users: 'id, clerkId',
      babies: 'id, createdAt, *caregiverIds',
      feeds: 'id, babyId, timestamp, createdAt',
      pendingOperations: '++localId, id, type, status, createdAt',
    });

    // Add version(2) for notifications
    this.version(2).stores({
      users: 'id, clerkId',
      babies: 'id, createdAt, *caregiverIds',
      feeds: 'id, babyId, timestamp, createdAt',
      pendingOperations: '++localId, id, type, status, createdAt',
      notifications: 'id, userId, createdAt, readAt, category, severity, babyId, dedupeKey',
    }).upgrade(tx => {
      // No data migration needed - new table
      console.log('[Dexie] Upgraded to version 2: added notifications table');
    });
  }
}
```

### `src/lib/local-db/helpers/user.ts`

Update `clearAllLocalData()` to include notifications:

```typescript
export async function clearAllLocalData(): Promise<void> {
  await localDb.transaction(
    'rw',
    [
      localDb.users,
      localDb.babies,
      localDb.feeds,
      localDb.pendingOperations,
      localDb.notifications, // Add this
    ],
    async () => {
      await Promise.all([
        localDb.users.clear(),
        localDb.babies.clear(),
        localDb.feeds.clear(),
        localDb.pendingOperations.clear(),
        localDb.notifications.clear(), // Add this
      ]);
    }
  );
}
```

---

## Constants

Add to appropriate constants file (or create `src/lib/local-db/constants.ts`):

```typescript
export const NOTIFICATION_RETENTION_DAYS = 60;
export const MAX_NOTIFICATIONS = 500;
export const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Open app in browser, check DevTools > Application > IndexedDB
3. Verify `BabyLogDatabase` shows version 2
4. Verify `notifications` table exists with correct indexes

---

## Dependencies

None - this is the foundation for all other phases.

---

## Status

⏳ Pending
