'use client';

/**
 * NotificationBell Component
 *
 * Bell icon with unread notification indicator dot.
 * Navigates to /notifications on click.
 *
 * @see .readme/planning/16-notification.md
 */

import { Bell } from 'lucide-react';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import { useHasUnreadNotifications, useNotificationStore } from '@/stores/useNotificationStore';
import { Button } from '../ui/button';

export function NotificationBell() {
  const hasUnread = useHasUnreadNotifications();
  const unreadCount = useNotificationStore(state => state.unreadCount);

  return (
    <Link href="/notifications">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
        className="relative"
      >
        <Bell className="size-5" />
        {hasUnread && (
          <span
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive"
            aria-hidden="true"
          />
        )}
      </Button>
    </Link>
  );
}
