---
last_verified_at: 2026-01-17T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/
  - src/app/[locale]/(auth)/(app)/settings/
  - src/app/[locale]/(auth)/(app)/logs/
  - src/app/[locale]/(auth)/(app)/insights/
---

# Client-First Page Pattern

## Purpose
Documents the architectural pattern for dashboard pages that prioritize instant navigation by rendering from IndexedDB on the client rather than fetching from the server.

## Pattern Overview

Dashboard pages use a two-component pattern:

1. **Server Component (page.tsx)**: Minimal shell with no data fetching
2. **Client Component (*Content.tsx)**: Data loading from IndexedDB using `useLiveQuery`

## File Structure Convention

```
src/app/[locale]/(auth)/(app)/[route]/
├── page.tsx                    # Server component (minimal shell)
└── _components/
    └── [Route]Content.tsx      # Client component (data loading)
```

**Examples**:
- `overview/page.tsx` + `overview/_components/OverviewContent.tsx`
- `settings/page.tsx` + `settings/SettingsContent.tsx`
- `settings/babies/page.tsx` + `settings/babies/BabiesManagement.tsx`
- `settings/babies/[babyId]/page.tsx` + `settings/babies/[babyId]/EditBabyContent.tsx`

## Server Component Pattern

**Responsibilities**:
- Generate metadata for SEO/browser
- Pass locale to client component
- Set page title/breadcrumbs
- NO data fetching
- NO auth checks

**Template**:
```typescript
import type { Metadata } from 'next';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { RouteContent } from './_components/RouteContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Page Title',
  };
}

// Page is a simple shell - all data comes from IndexedDB client-side
// No auth() calls - Clerk middleware doesn't process this route
// This enables instant navigation

export default async function RoutePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <PageTitleSetter title="Page Title" />
      <RouteContent locale={locale} />
    </>
  );
}
```

## Client Component Pattern

**Responsibilities**:
- Read data from IndexedDB using `useLiveQuery`
- Render UI based on local data
- Handle user interactions
- Trigger server actions for writes
- Guard against missing bootstrap data

**Template**:
```typescript
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { localDb } from '@/lib/local-db/database';

type RouteContentProps = {
  locale: string;
};

export function RouteContent({ locale }: RouteContentProps) {
  const router = useRouter();

  // Read user from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  const babyId = userData?.defaultBabyId ?? null;

  // Guard: redirect if no local data (needs bootstrap)
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

  // Read specific data from IndexedDB
  const specificData = useLiveQuery(async () => {
    if (!babyId) return null;
    return await localDb.someTable
      .where('babyId')
      .equals(babyId)
      .toArray();
  }, [babyId]);

  // Loading state while IndexedDB queries run
  if (userData === undefined || specificData === undefined) {
    return <div>Loading...</div>;
  }

  // Render UI with local data
  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

## useLiveQuery Best Practices

### Why useLiveQuery?
`useLiveQuery` from `dexie-react-hooks` provides reactive IndexedDB queries - when data changes in IndexedDB (from server action → sync → local update), the component automatically re-renders.

### Query Structure
```typescript
const data = useLiveQuery(
  async () => {
    // IndexedDB query logic here
    return await localDb.table.toArray();
  },
  [dependencies], // Re-run when dependencies change
);
```

### Return Value States
- `undefined` = Loading (query hasn't completed yet)
- `null` = No data found (query completed, result is null)
- `T` = Data found

### Loading State Pattern
```typescript
// Wait for query to complete
if (data === undefined) {
  return <LoadingSpinner />;
}

// Handle no data case
if (data === null) {
  return <EmptyState />;
}

// Render with data
return <UI data={data} />;
```

### Chained Queries
When one query depends on another:

```typescript
// First query - get user
const userData = useLiveQuery(async () => {
  return await localDb.users.toCollection().first();
}, []);

const babyId = userData?.defaultBabyId ?? null;

// Second query - depends on babyId from first query
const feeds = useLiveQuery(async () => {
  if (!babyId) return null;
  return await localDb.feedLogs
    .where('babyId')
    .equals(babyId)
    .toArray();
}, [babyId]); // Re-run when babyId changes
```

## Bootstrap Guard Pattern

All client-first pages should guard against missing IndexedDB data.

### Standard Guard
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

### Why This Guard?
- User might navigate directly to a dashboard page via URL
- IndexedDB might be empty (fresh device, cleared cache)
- Bootstrap flow (`/account/bootstrap`) populates IndexedDB with initial data
- Without bootstrap data, pages would show empty/broken state

### Offline Handling
When offline and no local data exists, the guard checks `navigator.onLine` to avoid redirect loops. Consider showing an offline message instead.

## Data Flow

### Read (Client-Side)
```
Component Mount
  ↓
useLiveQuery() executes
  ↓
IndexedDB query
  ↓
Return data (or null)
  ↓
Component renders
```

### Write (Server Action + Sync)
```
User Action
  ↓
Server Action called
  ↓
Database updated (Postgres)
  ↓
Sync service pulls changes
  ↓
IndexedDB updated
  ↓
useLiveQuery() detects change
  ↓
Component re-renders automatically
```

## Navigation Performance

**Standard Next.js page navigation**:
1. Client requests page
2. Server runs middleware (auth check)
3. Server component fetches data
4. RSC payload generated
5. Client receives and renders

**Client-first page navigation**:
1. Client requests page
2. Minimal shell returned instantly
3. Client hydrates
4. IndexedDB query (local, <10ms)
5. Component renders

**Result**: Instant perceived performance.

## When to Use This Pattern

**Use client-first pages for**:
- Dashboard pages with frequent navigation
- Pages that display user-specific data
- Pages where instant load matters
- Pages that should work offline (future goal)

**DON'T use client-first pages for**:
- Marketing pages (SEO matters)
- Initial auth flows (need server validation)
- Pages with sensitive data requiring server-side auth checks

## Security Considerations

### Data Access is Client-Side
- IndexedDB is readable by client-side JavaScript
- Treat device security as the trust boundary
- Never store sensitive secrets in IndexedDB (tokens, API keys)
- Sensitive data should be minimal and session-scoped

### Write Operations Still Protected
- All mutations go through server actions
- Server actions call `auth()` to verify session
- API routes are protected by Clerk middleware
- Client cannot bypass server-side auth

### No Server-Side Page Protection
- These pages don't check auth on the server
- Malicious user can see the HTML/JS
- But without valid session, they can't write data
- And without bootstrap, IndexedDB is empty

**Trade-off**: Accept minimal risk for major performance gain.

## Migration Checklist

When converting a server-rendered page to client-first:

- [ ] Create `*Content.tsx` client component in `_components/`
- [ ] Move data fetching from server to `useLiveQuery` calls
- [ ] Replace Drizzle queries with IndexedDB queries
- [ ] Remove `auth()` calls from page.tsx
- [ ] Add bootstrap guard to client component
- [ ] Test: navigate directly to page via URL
- [ ] Test: verify data updates when server action runs
- [ ] Verify page loads instantly (no server delay)

## Related Documentation

- `.readme/chunks/performance.instant-navigation.md` - Overall architecture
- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema
- `.readme/chunks/local-first.store-hydration-pattern.md` - Store initialization
