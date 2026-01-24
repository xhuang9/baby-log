# Phase 3a: Bell Icon

## Goal

Create the NotificationBell component and add it to the AppHeader.

---

## Dependencies

- Phase 1c (Notification store) must be complete

---

## Files to Create

### `src/components/navigation/NotificationBell.tsx`

```typescript
'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const locale = useLocale();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const hasUnread = unreadCount > 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className={cn('relative', className)}
      aria-label={
        hasUnread
          ? `Notifications (${unreadCount} unread)`
          : 'Notifications'
      }
    >
      <Link href={`/${locale}/notifications`}>
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span
            className={cn(
              'absolute top-1 right-1',
              'h-2 w-2 rounded-full',
              'bg-primary',
              'ring-2 ring-background'
            )}
            aria-hidden="true"
          />
        )}
      </Link>
    </Button>
  );
}
```

---

## Files to Modify

### `src/components/navigation/AppHeader.tsx`

Add NotificationBell between the logo and ThemeToggle/Settings.

```typescript
import { NotificationBell } from './NotificationBell';

// In the header's right section, update the order:
// Before: ThemeToggle → Settings
// After:  NotificationBell → ThemeToggle → Settings

<div className="flex items-center gap-1">
  <NotificationBell />
  <ThemeToggle />
  <SettingsButton />
</div>
```

---

## Styling Notes

### Dot Indicator
- Uses `bg-primary` for the dot color (matches brand)
- `ring-2 ring-background` creates a subtle border that works in both light/dark modes
- Size: `h-2 w-2` (8px) - visible but not obtrusive

### Positioning
- Dot is `absolute top-1 right-1` to sit at the top-right of the bell icon
- Button uses `relative` for positioning context

### Responsive
- Same appearance on mobile and desktop
- Touch-friendly 44x44px tap target (from Button size="icon")

---

## Accessibility

- `aria-label` changes based on unread count
- Dot has `aria-hidden="true"` since it's decorative (count is in label)
- Focusable button with keyboard navigation support

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Navigate to the app header
3. Verify bell icon appears in correct position (Bell → Theme → Settings)
4. With 0 unread: no dot visible
5. Add a notification via console, verify dot appears
6. Click bell, verify navigation to `/[locale]/notifications`
7. Test in both light and dark modes

---

## Status

⏳ Pending
