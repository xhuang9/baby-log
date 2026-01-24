'use client';

/**
 * NotificationItem Component
 *
 * Individual notification row with severity indicator,
 * timestamp, and actions.
 */

import type { LocalNotification } from '@/lib/local-db/types/notifications';
import { AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/useNotificationStore';

type NotificationItemProps = {
  notification: LocalNotification;
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const markRead = useNotificationStore(state => state.markRead);
  const remove = useNotificationStore(state => state.remove);

  const isUnread = notification.readAt === null;

  const handleClick = () => {
    if (isUnread) {
      markRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    remove(notification.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      className={cn(
        'group relative flex gap-3 rounded-lg border p-3 transition-colors',
        isUnread
          ? 'border-primary/20 bg-primary/5 hover:bg-primary/10'
          : 'border-border bg-card hover:bg-accent/50',
      )}
    >
      {/* Severity icon */}
      <div className="shrink-0 pt-0.5">
        <SeverityIcon severity={notification.severity} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn('text-sm', isUnread && 'font-medium')}>
            {notification.title}
            {notification.count > 1 && (
              <span className="ml-1.5 text-muted-foreground">
                (
                {notification.count}
                x)
              </span>
            )}
          </h4>
          <div className="flex shrink-0 items-center gap-1">
            <CategoryBadge category={notification.category} />
          </div>
        </div>

        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {notification.message}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <time
            className="text-xs text-muted-foreground"
            dateTime={notification.createdAt.toISOString()}
          >
            {formatRelativeTime(notification.createdAt)}
          </time>

          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleDelete}
            aria-label="Delete notification"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div
          className="absolute top-3 right-3 size-2 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: LocalNotification['severity'] }) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="size-5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="size-5 text-amber-500" />;
    case 'info':
    default:
      return <Info className="size-5 text-primary" />;
  }
}

function CategoryBadge({ category }: { category: LocalNotification['category'] }) {
  const labels: Record<LocalNotification['category'], string> = {
    sync: 'Sync',
    access: 'Access',
    system: 'System',
    error: 'Error',
  };

  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {labels[category]}
    </span>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
