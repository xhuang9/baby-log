# Phase 5: Tests

## Goal

Add unit tests for notification helpers and stores, plus E2E tests for the notification UI flow.

---

## Dependencies

- All Phase 1-4 tasks must be complete

---

## Unit Tests

### `src/lib/local-db/helpers/notifications.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { localDb } from '../database';
import {
  addNotification,
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  pruneOldNotifications,
} from './notifications';

describe('notification helpers', () => {
  const testUserId = 999;

  beforeEach(async () => {
    // Clear test data
    await localDb.notifications.where('userId').equals(testUserId).delete();
  });

  afterEach(async () => {
    await localDb.notifications.where('userId').equals(testUserId).delete();
  });

  describe('addNotification', () => {
    it('creates a new notification', async () => {
      const notification = await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Test',
        message: 'Test message',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      expect(notification.id).toBeDefined();
      expect(notification.title).toBe('Test');
      expect(notification.count).toBe(1);
      expect(notification.readAt).toBeNull();
    });

    it('deduplicates by dedupeKey within time window', async () => {
      const dedupeKey = 'test:dedupe';

      const first = await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Test',
        message: 'First',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey,
      });

      const second = await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Test',
        message: 'Second',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey,
      });

      // Should be same notification with incremented count
      expect(second.id).toBe(first.id);
      expect(second.count).toBe(2);
      expect(second.message).toBe('Second'); // Message updated

      // Should only have one row
      const all = await getNotifications(testUserId);
      expect(all).toHaveLength(1);
    });
  });

  describe('getNotifications', () => {
    it('returns notifications sorted by createdAt desc', async () => {
      await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'First',
        message: 'First',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Second',
        message: 'Second',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      const notifications = await getNotifications(testUserId);

      expect(notifications[0].title).toBe('Second');
      expect(notifications[1].title).toBe('First');
    });

    it('filters by category', async () => {
      await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Sync',
        message: 'Sync',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      await addNotification({
        userId: testUserId,
        category: 'access',
        severity: 'error',
        title: 'Access',
        message: 'Access',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      const syncOnly = await getNotifications(testUserId, { category: 'sync' });

      expect(syncOnly).toHaveLength(1);
      expect(syncOnly[0].category).toBe('sync');
    });
  });

  describe('getUnreadCount', () => {
    it('counts only unread notifications', async () => {
      const n1 = await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Unread',
        message: 'Unread',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Read',
        message: 'Read',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      await markRead(n1.id);

      const count = await getUnreadCount(testUserId);
      expect(count).toBe(1);
    });
  });

  describe('markAllRead', () => {
    it('marks all user notifications as read', async () => {
      await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'One',
        message: 'One',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      await addNotification({
        userId: testUserId,
        category: 'sync',
        severity: 'info',
        title: 'Two',
        message: 'Two',
        source: 'system',
        babyId: null,
        entityType: null,
        entityId: null,
        metadata: null,
        dedupeKey: null,
      });

      await markAllRead(testUserId);

      const count = await getUnreadCount(testUserId);
      expect(count).toBe(0);
    });
  });
});
```

### `src/stores/useNotificationStore.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from './useNotificationStore';

// Mock the IndexedDB helpers
vi.mock('@/lib/local-db/helpers/notifications', () => ({
  getNotifications: vi.fn().mockResolvedValue([]),
  getUnreadCount: vi.fn().mockResolvedValue(0),
  addNotification: vi.fn().mockImplementation(async (input) => ({
    ...input,
    id: 'test-id',
    createdAt: new Date(),
    readAt: null,
    count: 1,
    origin: 'local',
    remoteId: null,
    expiresAt: null,
  })),
  markRead: vi.fn().mockResolvedValue(undefined),
  markAllRead: vi.fn().mockResolvedValue(undefined),
  deleteNotification: vi.fn().mockResolvedValue(undefined),
}));

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().reset();
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const state = useNotificationStore.getState();

    expect(state.items).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
    expect(state.isHydrated).toBe(false);
  });

  it('adds notification and increments unread count', async () => {
    const store = useNotificationStore.getState();

    await store.add({
      userId: 1,
      category: 'sync',
      severity: 'info',
      title: 'Test',
      message: 'Test',
      source: 'system',
      babyId: null,
      entityType: null,
      entityId: null,
      metadata: null,
      dedupeKey: null,
    });

    const state = useNotificationStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('resets state', () => {
    const store = useNotificationStore.getState();

    // Add some state
    store.add({
      userId: 1,
      category: 'sync',
      severity: 'info',
      title: 'Test',
      message: 'Test',
      source: 'system',
      babyId: null,
      entityType: null,
      entityId: null,
      metadata: null,
      dedupeKey: null,
    });

    store.reset();

    const state = useNotificationStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
    expect(state.isHydrated).toBe(false);
  });
});
```

---

## E2E Tests

### `tests/e2e/notifications/notifications.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to app
    await page.goto('/en');
    // ... login steps
  });

  test('bell icon navigates to notifications page', async ({ page }) => {
    await page.getByRole('link', { name: /notifications/i }).click();
    await expect(page).toHaveURL(/\/notifications/);
  });

  test('shows empty state when no notifications', async ({ page }) => {
    await page.goto('/en/notifications');
    await expect(page.getByText(/all caught up/i)).toBeVisible();
  });

  test('mark all read clears unread indicator', async ({ page }) => {
    // Trigger a system notification first
    await page.evaluate(() => {
      // @ts-ignore
      window.__TEST_ADD_NOTIFICATION?.();
    });

    // Verify dot appears on bell
    const bellDot = page.locator('[data-testid="notification-bell"] .unread-dot');
    await expect(bellDot).toBeVisible();

    // Go to notifications and mark all read
    await page.goto('/en/notifications');
    await page.getByRole('button', { name: /mark all read/i }).click();

    // Verify dot disappears
    await expect(bellDot).not.toBeVisible();
  });
});
```

---

## Test Configuration

Add test setup for IndexedDB mocking if needed:

### `vitest.setup.ts`

```typescript
import 'fake-indexeddb/auto';
```

### `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

---

## Run Commands

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test -- --watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e -- --ui
```

---

## Verification

1. All unit tests pass: `npm run test`
2. All E2E tests pass: `npm run test:e2e`
3. Coverage meets minimum threshold (if configured)
4. No TypeScript errors: `npm run typecheck`
5. No lint errors: `npm run lint`

---

## Status

⏳ Pending
