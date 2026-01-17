# Task 08: Handle RSC Requests When Offline (Optional Safety Net)

**Status:** ✅ Complete (`OfflineLink` component at `src/components/ui/offline-link.tsx`)

**Priority:** Low (safety net, not critical for performance)

**Note:** With pages now reading from IndexedDB, RSC failures are less impactful. The `OfflineLink` component provides graceful fallback when navigating offline.

## Problem (Original)

When clicking links offline, Next.js App Router makes RSC (React Server Component) payload requests that fail. This caused 500 errors.

## Why It's Less Critical Now

After Tasks 10-15:
1. Dashboard pages are client components reading from IndexedDB
2. No server data fetching in pages = no data-related failures
3. RSC payloads only contain layout/shell (minimal)
4. Cached HTML + client hydration handles most cases

## When This Is Still Useful

- Layout components that have server logic
- Edge cases where RSC is required
- Smoother navigation experience (avoids error flashes)

## Implementation (Simplified)

Instead of complex SW interception, use a simpler client-side approach:

### Option A: Offline-Aware Link Component

Create `src/components/ui/OfflineLink.tsx`:

```typescript
'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof NextLink>;

/**
 * Link that falls back to full page navigation when offline
 * Prevents RSC fetch failures during client-side navigation
 */
export function OfflineLink({ href, onClick, children, ...props }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call original onClick if provided
    onClick?.(e);

    // If offline, prevent client navigation and do full page nav
    if (!navigator.onLine && !e.defaultPrevented) {
      e.preventDefault();
      const url = typeof href === 'string' ? href : href.pathname || '/';
      window.location.href = url;
    }
  };

  return (
    <NextLink href={href} onClick={handleClick} {...props}>
      {children}
    </NextLink>
  );
}
```

### Option B: Global Navigation Interceptor (More Complete)

Add to a client provider that wraps the app:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function OfflineNavigationHandler() {
  const router = useRouter();

  useEffect(() => {
    // Intercept router.push when offline
    const originalPush = router.push.bind(router);

    // @ts-expect-error - monkey patching
    router.push = (href: string, options?: unknown) => {
      if (!navigator.onLine) {
        window.location.href = href;
        return;
      }
      return originalPush(href, options);
    };

    return () => {
      // @ts-expect-error - restore
      router.push = originalPush;
    };
  }, [router]);

  return null;
}
```

## Recommendation

**Skip this task initially.** After completing Tasks 10-15:
1. Test offline navigation
2. If it works well → skip this task
3. If you see RSC errors → implement Option A (simpler)

## Checklist (If Needed)

- [x] Test offline navigation after Tasks 10-15
- [x] If errors occur, create `OfflineLink` component
- [x] Replace `Link` imports in navigation components
- [ ] Test again

## Notes

- This is defensive programming, not critical path
- The SW-based approach from original plan still works but is overkill
- Client-side approach is simpler and easier to maintain
