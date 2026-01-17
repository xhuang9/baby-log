# Task 11: Create IndexedDbGuard Component

**Status:** ✅ Complete (exists at `src/components/guards/IndexedDbGuard.tsx`)

**Prerequisite:** Task 10 (or do together)

## Goal

Create a guard component that wraps dashboard pages and handles:
1. Check if IndexedDB is valid
2. If valid → render children
3. If invalid + online → redirect to bootstrap
4. If invalid + offline → show error

## Files to Create

### 1. `src/lib/local-db/validation.ts`

```typescript
import { localDb } from './database';

/**
 * Check if IndexedDB has valid data for offline use
 */
export async function isIndexedDbValid(): Promise<{
  valid: boolean;
  reason?: 'no_user' | 'no_session' | 'session_expired' | 'db_error';
}> {
  try {
    // Check for user record
    const user = await localDb.users.toCollection().first();
    if (!user) {
      return { valid: false, reason: 'no_user' };
    }

    // Check for auth session
    const session = await localDb.authSession.get('current');
    if (!session) {
      return { valid: false, reason: 'no_session' };
    }

    // Check session expiration
    if (session.expiresAt) {
      const expiresAt = new Date(session.expiresAt);
      if (new Date() > expiresAt) {
        return { valid: false, reason: 'session_expired' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('[IndexedDB] Validation error:', error);
    return { valid: false, reason: 'db_error' };
  }
}

/**
 * Clear all local data (for logout or reset)
 */
export async function clearLocalDb(): Promise<void> {
  await localDb.delete();
  await localDb.open();
}
```

### 2. `src/components/guards/IndexedDbGuard.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isIndexedDbValid } from '@/lib/local-db/validation';

type GuardState = 'loading' | 'valid' | 'needs_bootstrap' | 'offline_no_data';

type Props = {
  children: React.ReactNode;
  locale: string;
};

export function IndexedDbGuard({ children, locale }: Props) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    async function checkDb() {
      const result = await isIndexedDbValid();

      if (result.valid) {
        setState('valid');
        return;
      }

      // Invalid - check if we can redirect to bootstrap
      if (navigator.onLine) {
        // Online - redirect to bootstrap for initial sync
        router.replace(`/${locale}/account/bootstrap`);
        return;
      }

      // Offline with no valid data - show error
      setState('offline_no_data');
    }

    checkDb();
  }, [locale, router]);

  if (state === 'loading') {
    return <IndexedDbGuardSkeleton />;
  }

  if (state === 'offline_no_data') {
    return <OfflineNoDataError locale={locale} />;
  }

  return <>{children}</>;
}

function IndexedDbGuardSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function OfflineNoDataError({ locale }: { locale: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-bold">Setup Required</h1>
      <p className="text-muted-foreground max-w-md">
        You need to complete the initial setup while connected to the internet.
        Please connect and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3"
      >
        Retry
      </button>
    </div>
  );
}
```

### 3. Update layout to use guard

Edit `src/app/[locale]/(auth)/(app)/layout.tsx`:

```typescript
import { IndexedDbGuard } from '@/components/guards/IndexedDbGuard';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <IndexedDbGuard locale={locale}>
      {/* existing layout content */}
      {children}
    </IndexedDbGuard>
  );
}
```

## Checklist

- [ ] Create `src/lib/local-db/validation.ts`
- [ ] Create `src/components/guards/IndexedDbGuard.tsx`
- [ ] Update app layout to wrap with guard
- [ ] Test: Clear IndexedDB + online → redirects to bootstrap
- [ ] Test: Clear IndexedDB + offline → shows error
- [ ] Test: Valid IndexedDB → renders page

## Notes

- The guard runs client-side only
- Server components in the page can still exist but shouldn't fetch data
- The skeleton provides instant visual feedback
