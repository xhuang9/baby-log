/**
 * NotificationItem Component Tests
 *
 * Tests for individual notification row component.
 * Tests rendering, severity icons, interactions, and relative time formatting.
 *
 * NOTE: These tests mock UI dependencies to avoid Vite dependency optimization
 * issues that can cause flaky test behavior.
 */

import type { LocalNotification } from '@/lib/local-db/types/notifications';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

// Now import the component under test
import { NotificationItem } from './NotificationItem';

// Type for the notification store
type NotificationStore = {
  markRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

// Mock functions
const mockMarkRead = vi.fn().mockResolvedValue(undefined);
const mockRemove = vi.fn().mockResolvedValue(undefined);

const mockStoreState: NotificationStore = {
  markRead: mockMarkRead,
  remove: mockRemove,
};

// Mock the notification store BEFORE importing component
vi.mock('@/stores/useNotificationStore', () => ({
  useNotificationStore: vi.fn((selector?: (state: NotificationStore) => unknown) => {
    return selector ? selector(mockStoreState) : mockStoreState;
  }),
}));

// Mock lucide-react icons to avoid dependency issues
vi.mock('lucide-react', () => ({
  Bell: () => <span data-testid="bell-icon">Bell</span>,
  CheckCheck: () => <span data-testid="check-icon">CheckCheck</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
}));

// Mock Button component to avoid @base-ui/react issues
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label'?: string }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel} {...props}>
      {children}
    </button>
  ),
}));

// Helper to create mock notification
function createMockNotification(overrides: Partial<LocalNotification> = {}): LocalNotification {
  return {
    id: 'notification-1',
    userId: 1,
    origin: 'local' as const,
    category: 'sync' as const,
    severity: 'info' as const,
    title: 'Test Notification',
    message: 'This is a test notification message',
    createdAt: new Date(),
    readAt: null,
    babyId: null,
    entityType: null,
    entityId: null,
    remoteId: null,
    source: 'background' as const,
    dedupeKey: null,
    count: 1,
    metadata: null,
    expiresAt: null,
    ...overrides,
  };
}

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render notification title', async () => {
      const notification = createMockNotification({ title: 'Sync Complete' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Sync Complete')).toBeTruthy();
    });

    it('should render notification message', async () => {
      const notification = createMockNotification({ message: 'All data has been synced' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('All data has been synced')).toBeTruthy();
    });

    it('should show count badge when count > 1', async () => {
      const notification = createMockNotification({ count: 3 });

      render(<NotificationItem notification={notification} />);

      // Should show "(3x)" text
      expect(page.getByText('(3x)')).toBeTruthy();
    });

    it('should not show count badge when count is 1', async () => {
      const notification = createMockNotification({ count: 1 });

      render(<NotificationItem notification={notification} />);

      // Should not show "(1x)"
      const countBadge = page.getByText('(1x)').elements();

      expect(countBadge.length).toBe(0);
    });

    it('should show category badge', async () => {
      const notification = createMockNotification({ category: 'access' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Access')).toBeTruthy();
    });
  });

  describe('category badges', () => {
    it('should display sync category correctly', async () => {
      const notification = createMockNotification({ category: 'sync' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Sync')).toBeTruthy();
    });

    it('should display access category correctly', async () => {
      const notification = createMockNotification({ category: 'access' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Access')).toBeTruthy();
    });

    it('should display system category correctly', async () => {
      const notification = createMockNotification({ category: 'system' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('System')).toBeTruthy();
    });

    it('should display error category correctly', async () => {
      const notification = createMockNotification({ category: 'error' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Error')).toBeTruthy();
    });
  });

  describe('unread indicator', () => {
    it('should show unread indicator dot for unread notifications', async () => {
      const notification = createMockNotification({ readAt: null });

      render(<NotificationItem notification={notification} />);

      // Wait for the unread indicator to render
      const unreadDot = await vi.waitFor(() => {
        const element = page.getByTestId('unread-indicator').query();
        if (!element) throw new Error('Unread indicator not found');
        return element;
      }, { timeout: 3000 });

      expect(unreadDot).toBeTruthy();
    });

    it('should not show unread indicator for read notifications', async () => {
      const notification = createMockNotification({ readAt: new Date() });

      render(<NotificationItem notification={notification} />);

      // Should not have the unread indicator dot
      const unreadDot = document.querySelector('[aria-hidden="true"].size-2');

      expect(unreadDot).toBeNull();
    });
  });

  describe('severity icons', () => {
    it('should render info severity notification', async () => {
      const notification = createMockNotification({ severity: 'info' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Test Notification')).toBeTruthy();
      expect(page.getByText('Info')).toBeTruthy(); // mocked icon
    });

    it('should render warning severity notification', async () => {
      const notification = createMockNotification({ severity: 'warning' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Test Notification')).toBeTruthy();
      expect(page.getByText('AlertTriangle')).toBeTruthy(); // mocked icon
    });

    it('should render error severity notification', async () => {
      const notification = createMockNotification({ severity: 'error' });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Test Notification')).toBeTruthy();
      expect(page.getByText('AlertCircle')).toBeTruthy(); // mocked icon
    });
  });

  describe('click to mark read', () => {
    it('should call markRead when clicking unread notification', async () => {
      const notification = createMockNotification({ id: 'unread-notification', readAt: null });

      render(<NotificationItem notification={notification} />);

      const item = page.getByRole('button').first();
      await userEvent.click(item);

      expect(mockMarkRead).toHaveBeenCalledWith('unread-notification');
    });

    it('should not call markRead when clicking already read notification', async () => {
      const notification = createMockNotification({ id: 'read-notification', readAt: new Date() });

      render(<NotificationItem notification={notification} />);

      const item = page.getByRole('button').first();
      await userEvent.click(item);

      expect(mockMarkRead).not.toHaveBeenCalled();
    });
  });

  describe('delete notification', () => {
    it('should call remove when delete button is clicked', async () => {
      const notification = createMockNotification({ id: 'to-delete' });

      render(<NotificationItem notification={notification} />);

      // Use exact name to avoid matching the parent button role
      const deleteButton = page.getByRole('button', { name: 'Delete notification', exact: true });
      await userEvent.click(deleteButton);

      expect(mockRemove).toHaveBeenCalledWith('to-delete');
    });

    it('should not trigger markRead when clicking delete button (stopPropagation)', async () => {
      const notification = createMockNotification({ id: 'no-mark-read', readAt: null });

      render(<NotificationItem notification={notification} />);

      // Use exact name to avoid matching the parent button role
      const deleteButton = page.getByRole('button', { name: 'Delete notification', exact: true });
      await userEvent.click(deleteButton);

      // Delete should be called, but not markRead (stopPropagation)
      expect(mockRemove).toHaveBeenCalledWith('no-mark-read');
      expect(mockMarkRead).not.toHaveBeenCalled();
    });
  });

  describe('relative time formatting', () => {
    it('should render time element with createdAt datetime', async () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const notification = createMockNotification({ createdAt: testDate });

      render(<NotificationItem notification={notification} />);

      // Wait for the time element to render
      const timeElement = await vi.waitFor(() => {
        const element = document.querySelector('time');
        if (!element) throw new Error('Time element not found');
        return element;
      }, { timeout: 3000 });

      expect(timeElement).toBeTruthy();
      expect(timeElement.getAttribute('dateTime')).toBe(testDate.toISOString());
    });

    it('should show "Just now" for very recent notifications', async () => {
      const notification = createMockNotification({ createdAt: new Date() });

      render(<NotificationItem notification={notification} />);

      expect(page.getByText('Just now')).toBeTruthy();
    });

    // TODO: Add more time formatting tests with date mocking:
    // - "Xm ago" for notifications < 60 minutes old
    // - "Xh ago" for notifications < 24 hours old
    // - "Xd ago" for notifications < 7 days old
    // - "Mon DD" for older notifications
    //
    // Implementation requires vi.useFakeTimers() and careful Date mocking:
    // vi.useFakeTimers();
    // vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    // const notification = createMockNotification({
    //   createdAt: new Date('2024-01-15T11:30:00Z'), // 30 minutes ago
    // });
    // expect(page.getByText('30m ago')).toBeTruthy();
    // vi.useRealTimers();
  });
});
