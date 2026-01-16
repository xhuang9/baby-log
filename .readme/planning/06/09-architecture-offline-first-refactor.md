# Architecture: True Offline-First Refactor

## Overview

Convert from server-first (Clerk-protected pages reading from Postgres) to offline-first (public pages reading from IndexedDB, Clerk-protected API sync).

## Current vs Target Architecture

### Current (Server-First)
```
User → Clerk Middleware → Page (Server) → Postgres → Render
         ↓ (blocks offline)
```

### Target (Offline-First)
```
User → Page (Client) → IndexedDB → Render
                            ↓
         [Background] → API (Clerk) → Postgres ↔ Sync
```

## Key Principles

1. **Pages are shells** - No server data fetching, just render from IndexedDB
2. **API routes are gated** - All sync endpoints require Clerk auth
3. **Bootstrap is the entry point** - First-time or expired users go through bootstrap
4. **Queue everything** - All mutations go to outbox first, sync later

## Flow Diagrams

### Page Load Flow
```
Page Load
    ↓
Check IndexedDB exists & valid?
    ├─ YES → Render UI from IndexedDB
    │         ├─ Online? → Queue background sync
    │         └─ Offline? → Show offline banner, queue actions
    │
    └─ NO → Check online?
             ├─ YES → Redirect to /account/bootstrap
             └─ NO → Show "Setup Required" error
```

### Bootstrap Flow
```
/account/bootstrap
    ↓
Check Clerk auth?
    ├─ NO → Redirect to /sign-in
    │
    └─ YES → Call /api/sync/initial
              ├─ Success → Populate IndexedDB → Redirect to /overview
              └─ Failure → Show error, retry option
```

### Action Flow (e.g., Log Feed)
```
User clicks "Log Feed"
    ↓
Write to IndexedDB (feedLogs table)
    ↓
Add to Outbox (status: pending)
    ↓
UI updates immediately (optimistic)
    ↓
[Background Sync Service]
    ├─ Online + Auth valid?
    │   ├─ YES → POST /api/sync/push
    │   │         ├─ Success → Mark outbox entry as synced
    │   │         └─ Conflict → Merge resolution
    │   │
    │   └─ NO → Keep in queue, retry later
```

## Security Model

| Resource | Protection | Why |
|----------|-----------|-----|
| Dashboard pages | None (public) | Just UI shells, no sensitive data in HTML |
| API /api/sync/* | Clerk auth required | Actual data access |
| API /api/bootstrap | Clerk auth required | Initial data population |
| IndexedDB | Browser origin isolation | Per-device, per-user |

**Why this is secure:**
- Unauthenticated user visits `/overview` → sees empty UI or redirect
- No server-side data in page HTML
- All data comes from IndexedDB (which requires prior auth to populate)
- Sync APIs verify ownership before returning/accepting data

## Files to Change

### Middleware (src/proxy.ts)
Remove dashboard routes from protection:
```typescript
const isProtectedRoute = createRouteMatcher([
  // REMOVE these:
  // '/overview(.*)',
  // '/settings(.*)',
  // '/logs(.*)',
  // '/insights(.*)',

  // KEEP these (API routes):
  '/account(.*)',           // Bootstrap still needs auth
  '/:locale/account(.*)',
  '/api/bootstrap(.*)',
  '/:locale/api/bootstrap(.*)',
  '/api/sync(.*)',
  '/:locale/api/sync(.*)',
]);
```

### Dashboard Pages
Convert to client components:
- `overview/page.tsx` - Already done in Task 07
- `logs/page.tsx` - Convert
- `insights/page.tsx` - Convert
- `settings/page.tsx` - Convert
- `settings/babies/page.tsx` - Convert
- `settings/babies/[babyId]/page.tsx` - Convert
- `settings/babies/new/page.tsx` - Convert

### New Components
- `src/components/guards/IndexedDbGuard.tsx` - Wrapper that checks IndexedDB
- `src/lib/sync/outbox-processor.ts` - Background sync service
- `src/lib/sync/sync-scheduler.ts` - Periodic sync scheduler

### API Routes (verify protection)
- `/api/sync/initial` - Initial data fetch (exists)
- `/api/sync/pull` - Pull server changes (exists)
- `/api/sync/push` - Push local changes (exists)

## IndexedDB Validity Check

What makes IndexedDB "valid"?
1. Database exists (`baby-log`)
2. User record exists with valid `id`
3. At least one baby record exists (or user has no babies yet)
4. `authSession` exists and not expired

```typescript
async function isIndexedDbValid(): Promise<boolean> {
  try {
    const user = await localDb.users.toCollection().first();
    if (!user) return false;

    const session = await localDb.authSession.get('current');
    if (!session) return false;
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

## Outbox Processing

```typescript
async function processOutbox() {
  // Only process if online and authenticated
  if (!navigator.onLine) return;

  const pendingEntries = await localDb.outbox
    .where('status')
    .equals('pending')
    .toArray();

  for (const entry of pendingEntries) {
    await localDb.outbox.update(entry.mutationId, { status: 'syncing' });

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        body: JSON.stringify(entry),
        credentials: 'include', // Send Clerk cookies
      });

      if (response.ok) {
        await localDb.outbox.update(entry.mutationId, { status: 'synced' });
      } else if (response.status === 409) {
        // Conflict - handle merge
        await handleConflict(entry, await response.json());
      } else if (response.status === 401) {
        // Auth expired - stop processing, redirect to login
        break;
      }
    } catch (error) {
      await localDb.outbox.update(entry.mutationId, {
        status: 'failed',
        lastAttemptAt: new Date(),
        errorMessage: error.message,
      });
    }
  }
}
```

## Conflict Resolution Strategy

Use **Last-Write-Wins (LWW)** based on `updatedAt`:
1. Server receives push with `{ id, updatedAt, ...data }`
2. Server compares with its `updatedAt` for same `id`
3. If client is newer → accept
4. If server is newer → reject with 409, return server version
5. Client receives 409 → update local with server version

## Task Breakdown

| Task | Description | Files |
|------|-------------|-------|
| 10 | Update middleware to unprotect dashboard routes | `src/proxy.ts` |
| 11 | Create IndexedDbGuard component | New component |
| 12 | Create outbox processor service | New service |
| 13 | Create sync scheduler (periodic background sync) | New service |
| 14 | Convert logs page to client component | `logs/page.tsx` |
| 15 | Convert settings pages to client components | `settings/**` |
| 16 | Convert insights page to client component | `insights/page.tsx` |
| 17 | Update bootstrap flow for initial sync | `bootstrap/page.tsx` |
| 18 | Add auth session persistence | `src/lib/local-db/` |
