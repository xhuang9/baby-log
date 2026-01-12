---
last_verified_at: 2026-01-13T00:00:00Z
source_paths:
  - src/lib/local-db/database.ts
  - src/lib/local-db/types/sync.ts
  - src/lib/local-db/helpers/auth-session.ts
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/components/auth/SignOutButton.tsx
  - src/components/OfflineBanner.tsx
  - src/templates/AppShell.tsx
  - src/services/sync-service.ts
  - public/offline-auth-sw.js
  - public/offline.html
---

# Offline Authentication Bypass

## Purpose

Enables users who have previously authenticated to access the app offline without requiring Clerk validation. Solves the problem where Clerk's middleware blocks protected routes before the app can check IndexedDB for cached data.

## Problem Addressed

**Before**: User opens app offline -> Clerk middleware -> Network request -> BLOCKED

**After**: User opens app offline -> Check cached session in IndexedDB -> If valid, serve cached app

## Architecture

### Session Marker in IndexedDB

A new `authSession` table (added in database version 4) stores a session marker:

```typescript
type AuthSession = {
  id: 'current';           // Singleton key
  userId: number;          // Local user ID
  clerkId: string;         // Clerk user ID for validation
  lastAuthAt: Date;        // Last successful auth timestamp
  expiresAt: Date | null;  // Expiration (default: 7 days)
};
```

### Session Lifecycle

1. **On Login/Bootstrap**: Session marker saved to IndexedDB
2. **On Successful Sync**: Session refreshed (extends offline window)
3. **On Sign Out**: Session marker cleared
4. **On Expiration**: Offline access denied, requires re-authentication

## Key Files

### Helper Functions (`src/lib/local-db/helpers/auth-session.ts`)

```typescript
// Save session after successful authentication
await saveAuthSession(userId, clerkId);

// Check if user has valid offline session
const { hasValidSession, session, isExpired } = await checkOfflineSession();

// Clear session on sign out
await clearAuthSession();

// Refresh session to extend offline window
await refreshAuthSession();
```

### Integration Points

**Bootstrap Machine** (`useBootstrapMachine.ts`):
- Calls `saveAuthSession()` after successful bootstrap sync

**Sign Out Button** (`SignOutButton.tsx`):
- Calls `clearAuthSession()` when user signs out

**Sync Service** (`sync-service.ts`):
- Calls `refreshAuthSession()` after successful full sync

### Offline UI (`OfflineBanner.tsx`)

Shows a banner when offline with states:
- **Offline**: Yellow banner "You're offline - changes will sync when reconnected"
- **Reconnecting**: Green banner "Back online - syncing..."

Uses data attributes for CSS-based state management (avoids setState in useEffect):
```tsx
<div
  data-offline={!isOnline}
  data-reconnecting="false"
  className="data-[offline=true]:bg-yellow-500 data-[reconnecting=true]:bg-green-500"
>
```

### Service Worker (`public/offline-auth-sw.js`)

Custom service worker logic for navigation interception:
1. Listens for fetch events on protected routes
2. If offline, checks IndexedDB for valid auth session
3. If valid session exists, serves cached app from next-pwa cache
4. Falls back to `offline.html` if no cache available

**Note**: This file needs to be imported into the main service worker. Configure via `workboxOptions.importScripts` or custom worker integration.

### Offline Fallback Page (`public/offline.html`)

Static HTML page shown when:
- User is offline
- Has valid session but no cached page content

Features:
- Shows connection status
- Checks and displays session status from IndexedDB
- Auto-reloads when back online

## Configuration

### Offline Window Duration

Default is 7 days, configurable in `auth-session.ts`:

```typescript
const DEFAULT_OFFLINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
```

### Protected Routes (in service worker)

```javascript
const PROTECTED_ROUTE_PATTERNS = [
  /^\/[a-z]{2}\/overview/,
  /^\/overview/,
  /^\/[a-z]{2}\/logs/,
  // ... etc
];
```

## Testing Offline Auth Bypass

1. Log in to the app (creates session marker)
2. Navigate around to cache pages
3. Go offline (DevTools > Network > Offline)
4. Refresh - app should load from cache
5. OfflineBanner shows "You're offline"
6. Go back online - shows "Back online - syncing..."

## Security Considerations

- **7-day offline window**: Limits exposure if device is compromised
- **Session cleared on sign out**: Explicit logout prevents offline access
- **Session refresh on sync**: Active users get extended access
- **Mutations still queue**: Offline changes sync when online (outbox pattern)

## Limitations

1. **First-time users**: Must be online for initial login
2. **Session expiration**: After 7 days offline, re-authentication required
3. **Service worker integration**: Custom SW needs manual integration with next-pwa

## Related Chunks

- `local-first.dexie-schema.md` - Database schema including authSession table
- `local-first.bootstrap-storage.md` - How bootstrap data is stored
- `local-first.outbox-pattern.md` - How offline mutations are handled
