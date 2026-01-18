---
last_verified_at: 2026-01-18T12:33:25Z
source_paths:
  - src/proxy.ts
  - src/app/[locale]/(auth)/(app)/overview/page.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyContent.tsx
conversation_context: "Updated instant-navigation docs after moving SettingsContent into _components."
---

# Instant Navigation Architecture (Performance-First)

## Purpose
Documents the architectural shift from "full offline support" to "instant page loads" as the primary goal, achieved by skipping server-side authentication checks on dashboard pages.

## Priority Shift

**Original Goal**: Full offline support (app works when offline after initial sync)

**New Goal**: Performance-first instant navigation (page loads don't block on server)

**Key Insight**: Users experience server round-trip as "slowness" - eliminating auth blocking delivers instant perceived performance.

## Architecture Pattern

Dashboard pages now use an "instant-loading shell" pattern:

```
Page Navigation Flow:
  Click link → Instant shell render → Hydrate → IndexedDB read → UI update
  (No server blocking)

User Actions:
  Click/Submit → Server action → Sync → IndexedDB → UI reactively updates
```

## Middleware Changes (`src/proxy.ts`)

**Key Decision**: Dashboard routes completely skip Clerk middleware processing.

```typescript
const isProtectedRoute = createRouteMatcher([
  // Bootstrap flow - requires auth to get initial data
  '/account(.*)',
  '/:locale/account(.*)',

  // API routes - data access requires auth
  '/api/bootstrap(.*)',
  '/:locale/api/bootstrap(.*)',
  '/api/sync(.*)',
  '/:locale/api/sync(.*)',
]);
```

**What's NOT protected**:
- `/overview`
- `/settings/*`
- `/logs`
- `/insights`
- All other dashboard pages

**What IS protected**:
- API routes (`/api/bootstrap`, `/api/sync`)
- Auth pages (`/sign-in`, `/sign-up`)
- Bootstrap flow

**Result**: Dashboard pages render without waiting for Clerk server-side auth check.

## Page Architecture Pattern

All dashboard pages follow this structure:

### Server Component (page.tsx)
- Minimal shell - no `auth()` calls
- No database queries
- Only passes locale to client component
- Generates metadata

**Example** (`overview/page.tsx`):
```typescript
export default async function OverviewPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <PageTitleSetter title="Overview" />
      <OverviewContent locale={locale} />
    </>
  );
}
```

### Client Component (*Content.tsx)
- Uses `useLiveQuery` from `dexie-react-hooks`
- Reads all data from IndexedDB
- Reactive updates when data changes
- No server calls during render

**Example** (`OverviewContent.tsx`):
```typescript
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db/database';

export function OverviewContent({ locale }: OverviewContentProps) {
  // Get current user from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  const babyId = userData?.defaultBabyId ?? null;

  // Read latest feed from IndexedDB
  const latestFeedData = useLiveQuery(async () => {
    if (!babyId) return null;
    return await localDb.feedLogs
      .where('babyId')
      .equals(babyId)
      .reverse()
      .sortBy('startedAt');
  }, [babyId]);

  // Render UI...
}
```

## Files Changed

All dashboard pages converted to instant-loading shell pattern:

### Overview
- `src/app/[locale]/(auth)/(app)/overview/page.tsx` - minimal shell
- `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx` - client component with `useLiveQuery`

### Settings
- `src/app/[locale]/(auth)/(app)/settings/page.tsx` - minimal shell
- `src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx` - client component

### Baby Management
- `src/app/[locale]/(auth)/(app)/settings/babies/page.tsx` - minimal shell
- `src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx` - client component
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx` - minimal shell
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyContent.tsx` - new client component

## Component Changes

### AppSidebar (`src/components/navigation/AppSidebar.tsx`)

**Before**: Called `getUserBabies()` server action on mount
**After**: Uses `useLiveQuery` to read babies from IndexedDB

```typescript
// Read babies from IndexedDB instead of server action
const babiesFromDb = useLiveQuery(async () => {
  const user = await localDb.users.toCollection().first();
  if (!user) return [];

  const accessList = await localDb.babyAccess.toArray();
  const babyIds = accessList.map(a => a.babyId);

  const babies = await localDb.babies
    .where('id')
    .anyOf(babyIds)
    .toArray();

  return babies
    .filter(b => b.archivedAt === null)
    .map(baby => {
      const access = accessList.find(a => a.babyId === baby.id);
      return {
        babyId: baby.id,
        name: baby.name,
        birthDate: baby.birthDate,
        accessLevel: access?.accessLevel ?? 'viewer',
        caregiverLabel: access?.caregiverLabel ?? null,
      };
    });
}, []);
```

**Result**: Sidebar renders instantly without RSC requests.

## Data Flow

### Read Path (Instant)
```
UI Component → useLiveQuery → IndexedDB → Render
(Completely client-side, no server blocking)
```

### Write Path (Background sync)
```
User Action → Server Action → Database Update → Sync → IndexedDB → useLiveQuery re-renders
(Server action still requires auth, but doesn't block navigation)
```

## Key Deviations from Standard Next.js

1. **Dashboard pages are NOT server-side authenticated**
   - Standard Next.js pattern: protect routes with middleware
   - This project: skip middleware for performance, rely on API-level auth

2. **Pages are minimal shells, not data loaders**
   - Standard Next.js pattern: fetch data in server components
   - This project: server component = shell, client component = data loader

3. **IndexedDB is the immediate read model**
   - Standard Next.js pattern: read from database on server
   - This project: read from IndexedDB on client, server only for writes

## What's Deferred (NOT Implemented Yet)

**Full offline support**:
- Clerk fallback when offline (currently still requires online session)
- Outbox processor for queuing mutations offline
- Sync scheduler for periodic background sync

**Current limitation**: User must be online during initial session establishment. After that, pages load instantly from IndexedDB.

## Bootstrap Requirement

Pages assume IndexedDB has been populated by bootstrap flow.

**Guard pattern** (common in all Content components):
```typescript
useEffect(() => {
  // Wait for query to complete (undefined = loading)
  if (userData === undefined) return;

  // No user in IndexedDB = needs bootstrap
  if (userData === null || userData.defaultBabyId === null) {
    if (navigator.onLine) {
      router.push(`/${locale}/account/bootstrap`);
    }
  }
}, [userData, locale, router]);
```

## Performance Benefits

**Before**: Page navigation blocked until:
1. Clerk middleware verified session
2. Server component called `auth()`
3. Database query completed
4. RSC payload sent to client

**After**: Page navigation loads:
1. Minimal shell instantly
2. Client hydrates
3. IndexedDB read (local, fast)
4. UI updates

**Perceived performance**: Instant vs 200-500ms+ delay.

## Related Documentation

- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema
- `.readme/chunks/local-first.store-hydration-pattern.md` - Store initialization
- `.readme/chunks/performance.loading-states.md` - Loading UI patterns
- `.readme/planning/no-auth-offline.md` - Original design document
