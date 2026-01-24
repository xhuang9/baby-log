# Phase 3b: Notifications Page

## Goal

Create the notifications list page at `/[locale]/notifications`.

---

## Dependencies

- Phase 1c (Notification store) must be complete
- Phase 3a (Bell icon) should be complete for navigation

---

## Files to Create

### `src/app/[locale]/(auth)/(app)/notifications/page.tsx`

```typescript
import { getTranslations } from 'next-intl/server';
import { NotificationsPageContent } from './_components/NotificationsPageContent';

export async function generateMetadata() {
  const t = await getTranslations('notifications');
  return {
    title: t('pageTitle'),
  };
}

export default function NotificationsPage() {
  return <NotificationsPageContent />;
}
```

### `src/app/[locale]/(auth)/(app)/notifications/_components/NotificationsPageContent.tsx`

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationList } from './NotificationList';
import { NotificationFilters } from './NotificationFilters';
import { EmptyState } from './EmptyState';
import { Button } from '@/components/ui/button';
import { CheckCheck } from 'lucide-react';

export function NotificationsPageContent() {
  const t = useTranslations('notifications');
  const { items, unreadCount, isLoading, markAllRead } = useNotifications();

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('unreadCount', { count: unreadCount })}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            {t('markAllRead')}
          </Button>
        )}
      </div>

      {/* Filters (optional - can add later) */}
      {/* <NotificationFilters /> */}

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">
          {t('loading')}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}
```

### `src/app/[locale]/(auth)/(app)/notifications/_components/NotificationList.tsx`

```typescript
'use client';

import type { LocalNotification } from '@/lib/local-db/types/notifications';
import { NotificationItem } from './NotificationItem';

interface NotificationListProps {
  items: LocalNotification[];
}

export function NotificationList({ items }: NotificationListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <NotificationItem key={item.id} notification={item} />
      ))}
    </ul>
  );
}
```

### `src/app/[locale]/(auth)/(app)/notifications/_components/NotificationItem.tsx`

```typescript
'use client';

import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { LocalNotification } from '@/lib/local-db/types/notifications';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, RefreshCw, Shield } from 'lucide-react';

interface NotificationItemProps {
  notification: LocalNotification;
}

const categoryIcons = {
  sync: RefreshCw,
  access: Shield,
  system: Info,
  error: AlertCircle,
} as const;

const severityColors = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

export function NotificationItem({ notification }: NotificationItemProps) {
  const t = useTranslations('notifications');
  const markRead = useNotificationStore((s) => s.markRead);
  const isUnread = notification.readAt === null;

  const Icon = categoryIcons[notification.category] || Info;
  const timeAgo = formatDistanceToNow(notification.createdAt, { addSuffix: true });

  const handleClick = () => {
    if (isUnread) {
      markRead(notification.id);
    }
  };

  return (
    <li
      onClick={handleClick}
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-colors',
        isUnread
          ? 'bg-muted/50 border-primary/20'
          : 'bg-background border-border hover:bg-muted/30'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon
            className={cn(
              'h-5 w-5',
              notification.severity === 'error' && 'text-red-500',
              notification.severity === 'warning' && 'text-yellow-500',
              notification.severity === 'info' && 'text-blue-500'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn('font-medium', isUnread && 'text-foreground')}>
                {notification.title}
              </span>
              {notification.count > 1 && (
                <Badge variant="secondary" className="text-xs">
                  ×{notification.count}
                </Badge>
              )}
            </div>
            <Badge className={cn('text-xs', severityColors[notification.severity])}>
              {t(`severity.${notification.severity}`)}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            {timeAgo}
          </p>
        </div>
      </div>
    </li>
  );
}
```

### `src/app/[locale]/(auth)/(app)/notifications/_components/EmptyState.tsx`

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';

export function EmptyState() {
  const t = useTranslations('notifications');

  return (
    <div className="py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">{t('emptyTitle')}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {t('emptyDescription')}
      </p>
    </div>
  );
}
```

### `src/app/[locale]/(auth)/(app)/notifications/_components/NotificationFilters.tsx`

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { NotificationCategory } from '@/lib/local-db/types/notifications';

interface NotificationFiltersProps {
  activeFilter: NotificationCategory | 'all';
  onFilterChange: (filter: NotificationCategory | 'all') => void;
}

export function NotificationFilters({
  activeFilter,
  onFilterChange,
}: NotificationFiltersProps) {
  const t = useTranslations('notifications.filters');

  const filters: Array<{ key: NotificationCategory | 'all'; label: string }> = [
    { key: 'all', label: t('all') },
    { key: 'sync', label: t('sync') },
    { key: 'access', label: t('access') },
    { key: 'system', label: t('system') },
    { key: 'error', label: t('error') },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
```

### `src/app/[locale]/(auth)/(app)/notifications/_components/index.ts`

```typescript
export { NotificationsPageContent } from './NotificationsPageContent';
export { NotificationList } from './NotificationList';
export { NotificationItem } from './NotificationItem';
export { NotificationFilters } from './NotificationFilters';
export { EmptyState } from './EmptyState';
```

---

## Translation Keys

Add to `messages/en.json`:

```json
{
  "notifications": {
    "pageTitle": "Notifications",
    "title": "System Notifications",
    "unreadCount": "{count, plural, one {# unread} other {# unread}}",
    "markAllRead": "Mark all read",
    "loading": "Loading...",
    "emptyTitle": "You're all caught up",
    "emptyDescription": "System notifications will appear here",
    "severity": {
      "info": "Info",
      "warning": "Warning",
      "error": "Error"
    },
    "filters": {
      "all": "All",
      "sync": "Sync",
      "access": "Access",
      "system": "System",
      "error": "Errors"
    }
  }
}
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Navigate to `/en/notifications`
3. Verify empty state displays when no notifications
4. Add test notifications via console
5. Verify list renders with correct styling
6. Click unread notification, verify it marks as read
7. Click "Mark all read", verify all items update
8. Test in both light and dark modes

---

## Status

⏳ Pending
