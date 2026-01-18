# Offline Authentication Bypass Plan

> **Status: REVERTED** - Option A was implemented but later reverted.
> **As of 2026-01-18**: All app routes now require Clerk middleware. No offline auth bypass.
> See "Implementation Status" and "Reversal Status" sections at the bottom for details.

## Problem Statement

Currently, when a user opens the app while offline (or the browser tab loses network connectivity), Clerk's authentication middleware blocks access to protected routes **before** the app can check IndexedDB for cached data.

**Current Flow (Broken Offline):**
```
User opens app → Clerk middleware → Network request to Clerk → BLOCKED (offline)
```

**Desired Flow (Offline-Capable):**
```
User opens app → Check for cached session → If cached: allow local access
                                          → If online: validate with Clerk
```

## Current Architecture Summary

| Component | Offline Support | Issue |
|-----------|-----------------|-------|
| IndexedDB data access | YES | Works fine |
| Outbox mutations | YES | Works fine |
| Clerk middleware | NO | Blocks all protected routes |
| Bootstrap endpoint | PARTIAL | Has offline fallback, but can't be reached |
| Zustand stores | YES | Hydrates from sessionStorage/IndexedDB |

## Solution Options

### Option A: Service Worker Auth Bypass (Recommended)

**Approach:** Use a service worker to intercept navigation requests to protected routes and serve cached HTML/JS when offline, bypassing Clerk entirely on the client side.

**Pros:**
- Clean separation of concerns
- Clerk remains authoritative for online scenarios
- PWA-native approach
- No changes to Clerk configuration

**Cons:**
- Service worker complexity
- Need to manage cached app shell
- First-time users still need online login

**Implementation:**
1. Service worker intercepts navigation to `/overview`, `/logs`, etc.
2. If offline + has cached session marker in IndexedDB → serve cached app shell
3. App loads, reads from IndexedDB, shows data
4. When online again, normal Clerk validation resumes

---

### Option B: Client-Side Route Guard (Moderate Change)

**Approach:** Move protected routes outside the `(auth)` group and implement client-side auth checking with offline fallback.

**Pros:**
- Simpler than service workers
- Full control over offline UX
- Can show "offline mode" indicators

**Cons:**
- Security consideration: client-side only protection
- Need to protect API routes separately
- Major route restructuring

**Implementation:**
1. Create new route group `(app)` outside `(auth)`
2. Use client-side hook to check:
   - Online → validate with Clerk
   - Offline + cached session → allow access
   - Offline + no cache → show "login required when online"
3. API routes remain Clerk-protected (fail gracefully offline)

---

### Option C: Clerk Offline Mode with Session Cache (Minimal Change)

**Approach:** Cache the Clerk session token in IndexedDB and configure Clerk to accept cached sessions when offline.

**Pros:**
- Minimal architectural changes
- Leverages existing Clerk setup

**Cons:**
- Clerk doesn't natively support offline validation
- Security concerns with cached tokens
- Token expiration handling complexity
- May violate Clerk's security model

**Implementation:**
1. After successful Clerk auth, cache session metadata in IndexedDB
2. Modify middleware to check for cached session when Clerk unavailable
3. Accept cached session for limited time window

---

### Option D: Hybrid PWA Shell + API Protection (Comprehensive)

**Approach:** Combine service worker for app shell delivery with smart API protection that degrades gracefully.

**Pros:**
- Best offline UX
- Maintains security for data operations
- Progressive enhancement

**Cons:**
- Most complex to implement
- Multiple moving parts

**Implementation:**
1. Service worker serves cached app shell
2. App checks online status on load
3. If offline: read-only mode from IndexedDB (mutations queue)
4. If online: full Clerk validation
5. API routes return cached responses or queue mutations

---

## Recommended Approach: Option A (Service Worker Auth Bypass)

This approach best aligns with the existing local-first architecture and PWA principles.

### Why Service Worker?

1. **Already PWA-ready**: The app has PWA infrastructure (`next-pwa` or similar)
2. **Clean separation**: Auth logic stays in Clerk, offline logic in service worker
3. **Standard pattern**: This is how offline-first PWAs work
4. **No Clerk hacking**: Don't need to work around Clerk's security model

---

## Implementation Plan

### Phase 1: Session Marker in IndexedDB

**Goal:** Track whether user has ever successfully authenticated

**Files to modify:**
- `src/lib/local-db/database.ts` - Add `authSession` table
- `src/hooks/useBootstrapMachine.ts` - Save session marker after bootstrap

**New IndexedDB Table:**
```typescript
interface AuthSession {
  id: 'current';  // singleton
  userId: string; // Clerk user ID
  lastAuthAt: Date;
  expiresAt: Date | null;
}
```

**Logic:**
```typescript
// After successful bootstrap
await db.authSession.put({
  id: 'current',
  userId: user.clerkId,
  lastAuthAt: new Date(),
  expiresAt: null  // or set reasonable offline window
});
```

---

### Phase 2: Service Worker Navigation Interception

**Goal:** Serve cached app when offline + has session marker

**Files to create/modify:**
- `public/sw.js` or integrate with existing service worker
- `src/app/layout.tsx` - Register service worker

**Service Worker Logic:**
```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept navigation requests to protected routes
  if (event.request.mode === 'navigate' && isProtectedRoute(url.pathname)) {
    event.respondWith(handleProtectedNavigation(event.request));
  }
});

async function handleProtectedNavigation(request) {
  // Try network first
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Offline - check for cached session
    const hasSession = await checkIndexedDBSession();
    if (hasSession) {
      // Serve cached app shell
      return caches.match('/offline-shell.html') ||
             caches.match(request);
    }
    // No session - show offline login page
    return caches.match('/offline-login.html');
  }
}
```

---

### Phase 3: Offline-Aware App Components

**Goal:** Show appropriate UI based on online/offline + auth state

**Files to modify:**
- `src/app/[locale]/(auth)/(app-unwrapped)/layout.tsx` - Add offline indicator
- Create `src/components/OfflineBanner.tsx`

**Offline States:**
| State | UI |
|-------|-----|
| Online + Authenticated | Normal app |
| Offline + Has Session | App + "Offline Mode" banner |
| Offline + No Session | "Please connect to login" page |
| Online + Session Expired | Redirect to Clerk login |

---

### Phase 4: Graceful API Degradation

**Goal:** API calls fail gracefully when offline

**Files to modify:**
- `src/services/sync-service.ts` - Already handles offline
- `src/hooks/useSyncScheduler.ts` - Already handles offline

**Current behavior (already good):**
- Push/pull sync disabled when offline
- Outbox queues mutations
- Auto-sync on reconnect

**Enhancement needed:**
- Add explicit offline check before API calls
- Show user-friendly errors instead of network failures

---

### Phase 5: Session Expiration & Security

**Goal:** Handle stale sessions and security edge cases

**Rules:**
1. **Offline window**: Allow offline access for up to 7 days since last auth
2. **Force re-auth**: After 7 days offline, require online login
3. **Sign out**: Clear IndexedDB session marker on explicit sign out
4. **Token refresh**: Update session marker on each successful API call

**Security Considerations:**
- Offline access is read-only (mutations queue but don't execute)
- No sensitive data operations without fresh auth
- Clear session on explicit logout
- Consider encrypting IndexedDB (optional, adds complexity)

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `public/sw.js` | Service worker with navigation interception |
| `public/offline-shell.html` | Cached app shell for offline |
| `public/offline-login.html` | "Please connect" page |
| `src/components/OfflineBanner.tsx` | Offline mode indicator |
| `src/lib/local-db/helpers/auth-session.ts` | Session marker helpers |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/local-db/database.ts` | Add `authSession` table |
| `src/hooks/useBootstrapMachine.ts` | Save session marker |
| `src/components/auth/SignOutButton.tsx` | Clear session marker |
| `src/app/layout.tsx` | Register service worker |
| `src/app/[locale]/(auth)/(app-unwrapped)/layout.tsx` | Add offline banner |

---

## Complexity Assessment

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Session Marker | Low | Low |
| Phase 2: Service Worker | Medium | Medium |
| Phase 3: Offline UI | Low | Low |
| Phase 4: API Degradation | Low | Low (mostly done) |
| Phase 5: Security | Medium | Medium |

**Total Estimate:** Medium-sized change

**Is this a big change?**
- **Moderate**: The core architecture already supports offline data access
- The main work is adding the service worker layer to bypass Clerk's navigation blocking
- Most of the heavy lifting (IndexedDB, outbox, sync) is already done

---

## Alternative: Quick Win (Minimal Viable Offline)

If full service worker implementation is too much, here's a minimal approach:

1. **Move app routes outside `(auth)`** - New route group `(app-offline)`
2. **Client-side auth check** - Use `useAuth()` hook with fallback
3. **Show offline banner** - When `!isOnline && hasLocalSession`

This is less elegant but faster to implement. Trade-off is that the app shell still needs to load from network the first time.

---

## Questions to Resolve

1. **Offline window duration**: How long should offline access be allowed?
   - Recommended: 7 days since last successful auth

2. **Read-only vs full offline**: Should offline mode allow creating new entries?
   - Current: Already allows (outbox pattern)
   - Recommended: Keep as-is, mutations queue and sync later

3. **Multi-device sessions**: Should offline access invalidate if user logs in elsewhere?
   - Recommended: No, each device is independent (local-first principle)

4. **Sign out behavior**: Should sign out clear all local data?
   - Recommended: Ask user "Keep data on this device?" option

---

## Next Steps

1. **Decide on approach**: Option A (service worker) or Quick Win?
2. **Phase 1**: Implement session marker in IndexedDB
3. **Phase 2**: Set up service worker (if Option A)
4. **Phase 3-5**: Iterate on UI and security

---

## References

- [Workbox - Service Worker Libraries](https://developer.chrome.com/docs/workbox/)
- [next-pwa Documentation](https://www.npmjs.com/package/next-pwa)
- [IndexedDB Session Storage Pattern](https://web.dev/articles/indexeddb)
- Current codebase: `.readme/sections/local-first.index.md`

---

## Implementation Status

**Implemented on:** 2026-01-13
**Approach:** Option A (Service Worker Auth Bypass)

### Completed Changes

#### Phase 1: Session Marker in IndexedDB
- Added `authSession` table to IndexedDB (version 4)
- Created `src/lib/local-db/helpers/auth-session.ts` with:
  - `saveAuthSession()` - Save session after login
  - `getAuthSession()` - Get current session
  - `clearAuthSession()` - Clear on sign out
  - `checkOfflineSession()` - Validate session with expiration check
  - `refreshAuthSession()` - Extend session on successful sync
- Modified `useBootstrapMachine.ts` to save session after successful bootstrap
- Modified `SignOutButton.tsx` to clear session on sign out
- Added `AuthSession` type in `src/lib/local-db/types/sync.ts`

#### Phase 2: Service Worker
- Created `public/offline-auth-sw.js` - Custom service worker for offline auth bypass
  - Intercepts navigation to protected routes when offline
  - Checks IndexedDB for valid auth session
  - Serves cached app if session is valid
  - Falls back to offline.html if no cache available
- Created `public/offline.html` - Offline fallback page with:
  - Connection status display
  - Session status check
  - Auto-reload when back online

#### Phase 3: Offline UI
- Created `src/components/OfflineBanner.tsx` - Shows banner when offline
  - Uses data attributes for CSS-based state management
  - Shows "Back online - syncing..." when reconnecting
- Added `OfflineBanner` to `src/templates/AppShell.tsx`

#### Phase 5: Session Expiration
- 7-day offline access window (configurable via `DEFAULT_OFFLINE_WINDOW_MS`)
- Session refresh on successful sync operations (in `sync-service.ts`)
- Expiration check in both client-side helpers and service worker

### Files Changed

**New Files:**
- `public/offline-auth-sw.js`
- `public/offline.html`
- `src/lib/local-db/helpers/auth-session.ts`
- `src/components/OfflineBanner.tsx`

**Modified Files:**
- `src/lib/local-db/database.ts` - Added authSession table
- `src/lib/local-db/types/sync.ts` - Added AuthSession type
- `src/lib/local-db/helpers/index.ts` - Export auth-session helpers
- `src/lib/local-db/helpers/user.ts` - Include authSession in clearAllLocalData
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` - Save session
- `src/components/auth/SignOutButton.tsx` - Clear session
- `src/services/sync-service.ts` - Refresh session on sync
- `src/templates/AppShell.tsx` - Add OfflineBanner

### How It Works

1. **On successful login/bootstrap:**
   - Session marker saved to IndexedDB with 7-day expiration
   - App is cached by next-pwa service worker

2. **When offline + accessing protected route:**
   - Custom service worker checks IndexedDB for valid session
   - If valid: serves cached app shell
   - If not valid: shows offline.html

3. **When back online:**
   - OfflineBanner shows "syncing" state briefly
   - Sync operations resume automatically
   - Session marker refreshed to extend offline window

4. **On sign out:**
   - Session marker cleared from IndexedDB
   - Future offline access requires re-authentication

### Testing

To test the offline auth bypass:
1. Log in to the app (this creates the session marker)
2. Navigate around to ensure pages are cached
3. Go offline (browser DevTools > Network > Offline)
4. Refresh or navigate - app should load from cache
5. OfflineBanner should show "You're offline" message
6. Go back online - should show "Back online - syncing..."

### Known Limitations

1. **First-time users:** Must be online for initial login
2. **Session expiration:** After 7 days offline, re-authentication required
3. **Service worker integration:** The custom offline-auth-sw.js is available but not automatically imported into the main next-pwa service worker. For full integration, consider using `customWorkerDir` option or post-build script to inject the code.

### Future Enhancements

1. Add option to ask user "Keep data on this device?" on sign out
2. Encrypt sensitive data in IndexedDB
3. Add visual indicator for session expiration warning (e.g., "Offline access expires in 2 days")

---

## Reversal Status

**Reverted on:** 2026-01-18
**Reason:** Architecture changed to require Clerk authentication on all app routes

### What Changed Back

The middleware configuration in `src/proxy.ts` was updated to include all app routes in `isProtectedRoute`:
- `/overview(.*)`
- `/logs(.*)`
- `/insights(.*)`
- `/settings(.*)`
- `/account(.*)`

### Why It Was Reverted

1. **Server actions require `auth()`** - Pages use server actions that need valid Clerk session
2. **Simplified security model** - Consistent auth boundary through Clerk middleware
3. **IndexedDB still used** - For data caching and sync, just not for auth bypass
4. **Service worker caching** - Can still cache pages for performance, but auth is required for initial load

### Current Architecture

- **All authenticated routes** run through Clerk middleware
- **IndexedDB** provides fast data access and caching
- **No offline auth bypass** - Initial page load requires valid authentication
- **Service worker** can cache assets and pages, but doesn't bypass auth

### Files Still Relevant

The following files from the original implementation are still used, but for different purposes:
- `src/lib/local-db/helpers/auth-session.ts` - May be used for session tracking
- `src/components/OfflineBanner.tsx` - Shows offline status
- IndexedDB tables and helpers - Used for data caching, not auth

### Files No Longer Used for Auth Bypass

- `public/offline-auth-sw.js` - Offline auth bypass logic (may still exist but not used)
- `public/offline.html` - Offline fallback page (may be used by service worker but not for auth bypass)
