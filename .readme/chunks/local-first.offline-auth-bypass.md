---
last_verified_at: 2026-01-17T09:12:39Z
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
---

# Offline Authentication Bypass

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Allow previously authenticated users to access protected routes while offline by checking a local auth session marker in IndexedDB.

## Key Deviations from Standard

- **Service-worker interception**: A custom SW script checks IndexedDB before blocking navigation when offline.
- **Local session marker**: `authSession` table stores a short-lived offline window (default 7 days).

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

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `DEFAULT_OFFLINE_WINDOW_MS` | `7 days` | Offline access window in auth-session helper.
| `AUTH_SESSION_KEY` | `current` | Singleton key for the session record.
| `PROTECTED_ROUTE_PATTERNS` | `/overview`, `/logs`, `/insights`, `/settings`, `/account/bootstrap` | Routes intercepted by the offline SW.

## Gotchas / Constraints

- **First-time users**: Without a cached session, offline access falls back to `offline.html`.
- **Cache dependency**: SW looks in the `others` cache; if no cached response exists, offline access still fails.

## Testing Notes

- Log in, navigate to a protected route, go offline, and refresh to verify cached content loads.
- Sign out and confirm offline navigation no longer works.

## Related Systems

- `.readme/chunks/performance.pwa-config.md` - Service worker importScript integration.
- `.readme/chunks/local-first.sync-status-tracking.md` - Sync refresh extends session.
