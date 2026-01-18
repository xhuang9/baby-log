---
last_verified_at: 2026-01-18T00:00:00Z
source_paths:
  - src/lib/local-db/database.ts
  - src/lib/local-db/types/sync.ts
  - src/lib/local-db/helpers/auth-session.ts
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/components/auth/SignOutButton.tsx
  - src/components/OfflineBanner.tsx
  - src/templates/AppShell.tsx
  - src/services/sync-service.ts
  - src/hooks/useAuthSessionSync.ts
  - src/lib/auth/session-manager.ts
  - public/offline-auth-sw.js
  - public/offline.html
  - src/proxy.ts
---

# Offline Authentication Bypass

> Status: **DEPRECATED - Architecture Changed**
> Last updated: 2026-01-18
> Owner: Core

## ⚠️ Architecture Change

**As of 2026-01-18**, this offline authentication bypass pattern is **NO LONGER IN USE**. All authenticated routes now require Clerk middleware authentication.

See `src/proxy.ts` - all app routes (overview, logs, insights, settings, account) are in the `isProtectedRoute` matcher and run through Clerk middleware. There is no bypass for offline access.

## Previous Purpose (Historical)

This documented an attempt to allow previously authenticated users to access protected routes while offline by checking a local auth session marker in IndexedDB.

## Why It Changed

The project moved from "offline-first with auth bypass" to "local-first with required auth":
- **Server actions require `auth()`** - All app pages use server actions that need valid Clerk authentication
- **Security model** - Clerk middleware provides consistent auth boundary
- **Simplified architecture** - No need for service worker auth bypass logic

## Current Architecture

- **All routes under `(auth)` require Clerk middleware** - Defined in `src/proxy.ts`
- **IndexedDB is still used** - For data caching and local storage, NOT for auth bypass
- **Offline mode** - Service worker can cache pages, but initial load requires authentication

## Architecture / Implementation

### Components
- `src/lib/local-db/database.ts` - Includes the `authSession` table in schema v1.
- `src/lib/local-db/helpers/auth-session.ts` - CRUD helpers for offline session.
- `src/hooks/useAuthSessionSync.ts` - Syncs Clerk auth into IndexedDB.
- `src/lib/auth/session-manager.ts` - Writes session records used by the hook.
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` - Saves session on successful bootstrap.
- `src/components/auth/SignOutButton.tsx` - Clears session on sign out.
- `src/services/sync-service.ts` - Refreshes session during successful sync.
- `public/offline-auth-sw.js` - SW logic for offline protected routes.
- `public/offline.html` - Fallback UI when offline and cache miss.

### Data Flow
1. On sign-in/bootstrap, `saveAuthSession` stores `authSession` in IndexedDB.
2. `offline-auth-sw.js` intercepts protected navigation when offline and checks `authSession`.
3. If valid, SW serves cached content or offline shell; otherwise it lets the request fail.
4. Sign-out clears the session marker.

### Code Pattern
```js
const session = await getAuthSessionFromIndexedDB();
if (session) {
  const cache = await caches.open('others');
  const cachedResponse = await cache.match(request, { ignoreSearch: true });
  return cachedResponse ?? fetch(request);
}
```

## Related Documentation

For understanding the current local-first architecture with required authentication:

- `.readme/chunks/architecture.client-first-pages.md` - How pages render from IndexedDB (but still require auth)
- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema for local data storage
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk authentication integration
- `src/proxy.ts` - Current middleware configuration showing all protected routes
