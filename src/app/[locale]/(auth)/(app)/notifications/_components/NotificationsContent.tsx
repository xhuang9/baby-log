'use client';

/**
 * NotificationsContent Component
 *
 * Main content area for the notifications page.
 * Lists all notifications with actions to mark as read.
 */

import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { NotificationItem } from './NotificationItem';

export function NotificationsContent() {
  const items = useNotificationStore(state => state.items);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const isLoading = useNotificationStore(state => state.isLoading);
  const markAllRead = useNotificationStore(state => state.markAllRead);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          role="status"
          data-testid="loader"
          className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with mark all read button */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unreadCount}
            {' '}
            unread notification
            {unreadCount !== 1 ? 's' : ''}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            className="gap-2"
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-2">
        {items.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Bell className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">No notifications</h3>
        <p className="text-sm text-muted-foreground">
          You're all caught up! We'll notify you when something happens.
        </p>
      </div>
    </div>
  );
}
