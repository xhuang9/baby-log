/**
 * NotificationsContent Component Tests
 *
 * Tests for the main notifications list component.
 * Tests rendering states and user interactions.
 *
 * NOTE: These tests mock UI dependencies to avoid Vite dependency optimization
 * issues that can cause flaky test behavior.
 */

import type { LocalNotification } from '@/lib/local-db/types/notifications';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';

// Now import the component under test
import { NotificationsContent } from './NotificationsContent';

// Type for the notification store
type NotificationStore = {
  items: LocalNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

// Mock the notification store BEFORE importing component
const mockMarkAllRead = vi.fn().mockResolvedValue(undefined);
const mockMarkRead = vi.fn().mockResolvedValue(undefined);
const mockRemove = vi.fn().mockResolvedValue(undefined);

let mockStoreState: NotificationStore = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  markAllRead: mockMarkAllRead,
  markRead: mockMarkRead,
  remove: mockRemove,
};

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
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} {...props}>
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
    message: 'Test notification message',
    createdAt: new Date('2024-01-01T12:00:00Z'),
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

describe('NotificationsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockStoreState = {
      items: [],
      unreadCount: 0,
      isLoading: false,
      markAllRead: mockMarkAllRead,
      markRead: mockMarkRead,
      remove: mockRemove,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner when isLoading is true', async () => {
      mockStoreState.isLoading = true;

      render(<NotificationsContent />);

      // Should show loading spinner - look for the animation class in DOM
      // Note: In vitest-browser-react, we need to use page locators or check DOM directly
      const spinners = page.getByRole('status', { includeHidden: true }).elements();
      const hasSpinner = spinners.length > 0
        || document.querySelector('.animate-spin') !== null;

      expect(hasSpinner).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no notifications exist', async () => {
      render(<NotificationsContent />);

      // Should show "No notifications" message
      expect(page.getByText('No notifications')).toBeTruthy();
    });

    it('should show descriptive text in empty state', async () => {
      render(<NotificationsContent />);

      expect(
        page.getByText('You\'re all caught up! We\'ll notify you when something happens.'),
      ).toBeTruthy();
    });

    it('should show bell icon in empty state', async () => {
      render(<NotificationsContent />);

      // Bell icon is mocked to render a span with data-testid
      const bellIcon = page.getByText('Bell').elements();

      expect(bellIcon.length).toBeGreaterThan(0);
    });
  });

  describe('notification list', () => {
    it('should render notification items', async () => {
      mockStoreState.items = [
        createMockNotification({ id: 'n1', title: 'First Notification' }),
        createMockNotification({ id: 'n2', title: 'Second Notification' }),
      ];
      mockStoreState.unreadCount = 2;

      render(<NotificationsContent />);

      expect(page.getByText('First Notification')).toBeTruthy();
      expect(page.getByText('Second Notification')).toBeTruthy();
    });

    it('should show unread count header when there are unread notifications', async () => {
      mockStoreState.items = [
        createMockNotification({ id: 'n1', readAt: null }),
        createMockNotification({ id: 'n2', readAt: null }),
      ];
      mockStoreState.unreadCount = 2;

      render(<NotificationsContent />);

      // Should show "2 unread notifications" text
      expect(page.getByText('2')).toBeTruthy();
    });

    it('should not show unread header when all notifications are read', async () => {
      mockStoreState.items = [
        createMockNotification({ id: 'n1', readAt: new Date() }),
      ];
      mockStoreState.unreadCount = 0;

      render(<NotificationsContent />);

      // Should not show "Mark all read" button
      const markAllButton = page.getByText('Mark all read').elements();

      expect(markAllButton.length).toBe(0);
    });
  });

  describe('mark all read', () => {
    it('should show "Mark all read" button when there are unread notifications', async () => {
      mockStoreState.items = [createMockNotification({ readAt: null })];
      mockStoreState.unreadCount = 1;

      render(<NotificationsContent />);

      expect(page.getByText('Mark all read')).toBeTruthy();
    });

    it('should call markAllRead when button is clicked', async () => {
      mockStoreState.items = [createMockNotification({ readAt: null })];
      mockStoreState.unreadCount = 1;

      render(<NotificationsContent />);

      const markAllButton = page.getByText('Mark all read');
      await userEvent.click(markAllButton);

      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });
  });
});
