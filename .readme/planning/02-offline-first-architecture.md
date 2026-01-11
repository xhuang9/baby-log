# Offline-First Architecture & SSR Strategy

**Priority:** High
**Dependencies:** 01-state-management-sync.md
**Estimated Scope:** Large

---

## Overview

Define the SSR strategy for the dashboard, enable true offline mode, and address security considerations for logged-in users without internet connectivity.

---

## Key Questions & Decisions

### Should SSR be disabled for the dashboard?

**Recommendation: Hybrid Approach**

| Section | SSR Strategy | Reason |
|---------|--------------|--------|
| Marketing pages | Full SSR | SEO, fast initial load |
| Auth pages (sign-in/up) | SSR | Needs server for Clerk |
| Dashboard shell | SSR | App frame, nav, layout |
| Dashboard content | Client-only | Data from IndexedDB |

**Rationale:**
- SSR the shell (header, sidebar, layout) for fast perceived load
- Content area renders from IndexedDB (instant, no server round-trip)
- Keeps the app functional offline after first load

### Can the app work offline?

**Yes, with conditions:**

| Scenario | Behavior |
|----------|----------|
| User logged in, has synced data | Full functionality, mutations queued |
| User logged in, never synced | Show "sync required" message |
| User not logged in | Redirect to sign-in (requires network) |
| User's session expired offline | Use cached session, sync on reconnect |

---

## Security Considerations

### Offline Session Handling

**Risk:** User is logged in, goes offline, session could expire.

**Mitigation:**
1. Store session expiry in IndexedDB
2. Show "session may be expired" warning after X hours offline
3. Queue all mutations in outbox
4. On reconnect: validate session first, then flush outbox
5. If session invalid: redirect to sign-in, preserve outbox for retry

### Data Access Control

**Risk:** Malicious user could modify IndexedDB directly.

**Mitigation:**
1. IndexedDB is only a cache - server is source of truth
2. All mutations go through outbox → API (server validates)
3. Server rejects unauthorized mutations
4. Periodic full sync corrects any local tampering

### Sensitive Data Storage

**Risk:** Sensitive data in IndexedDB on shared devices.

**Mitigation:**
1. Clear IndexedDB on logout
2. Don't store sensitive tokens in IndexedDB (use httpOnly cookies)
3. Consider encryption for sensitive fields (optional, adds complexity)

---

## Implementation Plan

### Phase 1: Shell-Only SSR

- [ ] Update `(app)` layout to render shell server-side
- [ ] Create `DashboardContent` client component wrapper
- [ ] Add `"use client"` boundary at content level
- [ ] Verify shell renders without JS

### Phase 2: Offline Detection

- [ ] Create `useOnlineStatus` hook
- [ ] Add offline indicator in header
- [ ] Show "offline mode" banner when disconnected
- [ ] Queue mutations when offline

### Phase 3: Session Management

- [ ] Store session metadata in IndexedDB (not tokens)
- [ ] Track `lastSyncAt` timestamp
- [ ] Implement session validation on reconnect
- [ ] Handle expired session gracefully

### Phase 4: PWA Enhancements

- [ ] Update service worker caching strategy
- [ ] Cache shell HTML for offline access
- [ ] Precache critical assets
- [ ] Add "install app" prompt

### Phase 5: Data Integrity

- [ ] Implement periodic full sync (detect drift)
- [ ] Add conflict detection (LWW still applies)
- [ ] Log sync errors for debugging
- [ ] Clear stale data on logout

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
├─────────────────────────────────────────────────────────┤
│  Service Worker                                         │
│  - Caches shell HTML, CSS, JS                          │
│  - Intercepts API calls when offline                    │
│  - Returns cached shell for navigation                  │
├─────────────────────────────────────────────────────────┤
│  App Shell (SSR)              │  Content (Client)       │
│  - Header                     │  - Dashboard tiles      │
│  - Sidebar                    │  - Logs list            │
│  - Layout structure           │  - Forms                │
│  - Loading skeletons          │  - Charts               │
├───────────────────────────────┴─────────────────────────┤
│  IndexedDB (Dexie)                                      │
│  - All baby data                                        │
│  - All logs                                             │
│  - Outbox (pending mutations)                          │
│  - Sync metadata                                        │
└─────────────────────────────────────────────────────────┘

ONLINE:  UI ← IndexedDB ← API ← Postgres
OFFLINE: UI ← IndexedDB (mutations queue in outbox)
```

---

## Offline User Flows

### Flow 1: Normal Offline Use
```
1. User opens app offline
2. Service worker serves cached shell
3. Client hydrates, reads from IndexedDB
4. User sees all data, can interact
5. Mutations saved to outbox
6. User goes online
7. Outbox flushes, data syncs
```

### Flow 2: Long Offline Period
```
1. User offline for 24+ hours
2. Session may have expired (server-side)
3. App shows "sync when online" message
4. User goes online
5. App checks session validity
6. If valid: flush outbox, sync
7. If invalid: redirect to sign-in, preserve outbox
```

---

## Success Criteria

- [ ] Dashboard shell loads without API calls
- [ ] Content renders instantly from IndexedDB
- [ ] App fully functional offline (after initial sync)
- [ ] Mutations queue and replay correctly
- [ ] Session expiry handled gracefully
- [ ] No security vulnerabilities introduced
