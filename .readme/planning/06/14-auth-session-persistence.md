# Task 14: Auth Session Persistence

**Status:** ✅ Complete (exists at `src/hooks/useAuthSessionSync.ts`, used in `AppShell.tsx`)

**Prerequisite:** None (can be done early)

## Goal

Persist Clerk auth session to IndexedDB so offline scripts can verify auth status.

## Problem

Currently `authSession` table exists but may not be populated. Need to:
1. Save session when user authenticates
2. Update session expiry
3. Clear session on logout

## Files to Create/Edit

### 1. Check existing type: `src/lib/local-db/types/sync.ts`

```typescript
// Should already have:
export type AuthSession = {
  id: string; // Always 'current'
  userId: string;
  clerkId: string;
  email: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
```

### 2. Create session manager: `src/lib/auth/session-manager.ts`

```typescript
import { localDb } from '@/lib/local-db/database';
import type { AuthSession } from '@/lib/local-db/types/sync';

const SESSION_KEY = 'current';
const SESSION_DURATION_DAYS = 7;

/**
 * Save or update the auth session in IndexedDB
 * Call this after successful Clerk authentication
 */
export async function saveAuthSession(params: {
  userId: string;
  clerkId: string;
  email: string | null;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const session: AuthSession = {
    id: SESSION_KEY,
    userId: params.userId,
    clerkId: params.clerkId,
    email: params.email,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  await localDb.authSession.put(session);
}

/**
 * Get current auth session
 */
export async function getAuthSession(): Promise<AuthSession | undefined> {
  return localDb.authSession.get(SESSION_KEY);
}

/**
 * Clear auth session (on logout)
 */
export async function clearAuthSession(): Promise<void> {
  await localDb.authSession.delete(SESSION_KEY);
}

/**
 * Refresh session expiry (call periodically while user is active)
 */
export async function refreshAuthSession(): Promise<void> {
  const session = await getAuthSession();
  if (!session) return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await localDb.authSession.update(SESSION_KEY, {
    expiresAt,
    updatedAt: now,
  });
}
```

### 3. Hook into Clerk auth flow

Create `src/hooks/useAuthSessionSync.ts`:

```typescript
'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { saveAuthSession, clearAuthSession } from '@/lib/auth/session-manager';
import { localDb } from '@/lib/local-db/database';

/**
 * Sync Clerk auth state to IndexedDB
 * Add to root layout or auth provider
 */
export function useAuthSessionSync() {
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    async function syncSession() {
      if (isSignedIn && user) {
        // Get local user ID from IndexedDB
        const localUser = await localDb.users
          .where('clerkId')
          .equals(user.id)
          .first();

        if (localUser) {
          await saveAuthSession({
            userId: localUser.id,
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? null,
          });
        }
      } else {
        // Not signed in - clear session
        await clearAuthSession();
      }
    }

    syncSession();
  }, [isLoaded, isSignedIn, user]);
}
```

### 4. Add hook to layout

In `src/app/[locale]/(auth)/(app)/layout.tsx`:

```typescript
'use client';

import { useAuthSessionSync } from '@/hooks/useAuthSessionSync';

function AuthSessionSyncWrapper({ children }: { children: React.ReactNode }) {
  useAuthSessionSync();
  return <>{children}</>;
}

// Wrap children with this
```

Or create a provider component if layout needs to stay server component.

## Checklist

- [ ] Verify `AuthSession` type in `src/lib/local-db/types/sync.ts`
- [ ] Create `src/lib/auth/session-manager.ts`
- [ ] Create `src/hooks/useAuthSessionSync.ts`
- [ ] Add hook to app layout
- [ ] Test: Sign in → check IndexedDB → authSession should exist
- [ ] Test: Sign out → authSession should be cleared

## Notes

- Session is keyed by 'current' (single session per device)
- 7-day expiry by default (configurable)
- The offline SW reads this to allow offline protected route access
- Must run AFTER initial sync populates local user record
