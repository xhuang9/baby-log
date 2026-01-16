# Task 07: Convert Overview Page to IndexedDB Reads

**Status:** [x] Complete

**Prerequisite:** Complete all Phase 1 tasks first.

## Problem

`src/app/[locale]/(auth)/(app)/overview/page.tsx` fetches all data server-side via Drizzle/Postgres:
- Uses `auth()` to get Clerk userId
- Queries `userSchema`, `babiesSchema`, `babyAccessSchema`, `feedLogSchema` from server DB
- Page cannot render offline - relies on server data

## Goal

Convert to client-side IndexedDB reads so data displays offline from Dexie.

## Architecture Pattern

Per `.readme/planning/02-offline-first-architecture.md`:
- SSR renders a shell/skeleton
- Client hydration reads from IndexedDB (Dexie)
- TanStack Query handles sync in background

## Implementation Strategy

### Step 1: Create Client Component for Overview Content

Create `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx`:

```typescript
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db/database';
import { ActivityTile } from './ActivityTile';
import { FeedTile } from './FeedTile';

export function OverviewContent({ babyId }: { babyId: string }) {
  // Read latest feed from IndexedDB
  const latestFeed = useLiveQuery(async () => {
    const feeds = await localDb.feedLogs
      .where('babyId')
      .equals(babyId)
      .reverse()
      .sortBy('startedAt');
    return feeds[0] ?? null;
  }, [babyId]);

  // Loading state while Dexie initializes
  if (latestFeed === undefined) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <FeedTile babyId={babyId} latestFeed={latestFeed} />
      <ActivityTile title="Sleep" subtitle="Coming soon" activity="sleep" disabled />
      <ActivityTile title="Nappy" subtitle="Coming soon" activity="nappy" disabled />
      <ActivityTile title="Solids" subtitle="Coming soon" activity="solids" disabled />
      <ActivityTile title="Bath" subtitle="Coming soon" activity="bath" disabled />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
```

### Step 2: Simplify Server Page

Update `src/app/[locale]/(auth)/(app)/overview/page.tsx`:

```typescript
import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { db } from '@/lib/db';
import { userSchema } from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { OverviewContent } from './_components/OverviewContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;
  return { title: 'Overview' };
}

export const dynamic = 'force-dynamic';

export default async function OverviewPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { userId } = await auth();

  if (!userId) {
    redirect(getI18nPath('/sign-in', locale));
  }

  // Minimal server check - just get defaultBabyId
  const [localUser] = await db
    .select({ defaultBabyId: userSchema.defaultBabyId })
    .from(userSchema)
    .where(eq(userSchema.clerkId, userId))
    .limit(1);

  if (!localUser?.defaultBabyId) {
    redirect(getI18nPath('/account/bootstrap', locale));
  }

  return (
    <>
      <PageTitleSetter title="Overview" />
      <OverviewContent babyId={localUser.defaultBabyId} />
    </>
  );
}
```

### Step 3: Update FeedTile to Accept LocalFeedLog Type

The `FeedTile` component may need type adjustments since `LocalFeedLog` from Dexie differs slightly from server types.

Check `src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx` and update prop types if needed.

## Files to Modify

1. Create: `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx`
2. Edit: `src/app/[locale]/(auth)/(app)/overview/page.tsx`
3. Possibly edit: `src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx`

## Checklist

- [x] Create `OverviewContent.tsx` client component
- [x] Add `useLiveQuery` from `dexie-react-hooks` for reactive IndexedDB reads
- [x] Simplify server page to only check auth + pass babyId
- [x] FeedTile types - no changes needed (accepts FeedLogWithCaregiver)
- [x] TypeScript check passes
- [x] Build successful

## Dependencies

```bash
# dexie-react-hooks should already be installed
# If not:
pnpm add dexie-react-hooks
```

## Validation

1. `pnpm build && pnpm start`
2. Visit `/en/overview` while online
3. Check DevTools → Application → IndexedDB → baby-log → feedLogs has data
4. Toggle offline in DevTools → Network
5. Reload - page should render with cached data

## Notes

- `useLiveQuery` returns `undefined` while loading, then the actual data
- Handle the `undefined` case with a skeleton/loading state
- Server page still handles auth redirects - this is correct
- The babyId comes from server, data comes from IndexedDB

## Implementation Notes

**Changes Made:**

1. **Created `OverviewContent.tsx`** (client component):
   - Uses `useLiveQuery` to read from `localDb.feedLogs` reactively
   - Queries latest feed by `babyId` with reverse sort on `startedAt`
   - Joins with `babyAccess` table to get `caregiverLabel`
   - Transforms `LocalFeedLog` (UUID string id) to `FeedLogWithCaregiver` (numeric id)
   - Shows skeleton loading state while Dexie initializes
   - Renders 5 activity tiles (Feed + 4 placeholder tiles)

2. **Simplified `page.tsx`** (server component):
   - Removed all Drizzle queries for baby details and feed logs
   - Only queries `userSchema` for `defaultBabyId`
   - Still handles auth checks and redirects (required for security)
   - Passes `babyId` to `OverviewContent` client component

3. **Type Compatibility**:
   - `LocalFeedLog.id` is `string` (UUID), but `FeedLogWithCaregiver.id` is `number`
   - Used `parseInt(uuid.slice(0, 8), 16)` to create numeric id for display
   - `LocalFeedLog` doesn't have `caregiverLabel`, so we join with `babyAccess` table
   - No changes needed to `FeedTile.tsx` - it already accepts `FeedLogWithCaregiver | null`

4. **TypeScript Fixes**:
   - Removed unused `@ts-expect-error` from `next.config.ts` (types now support `importScripts`)
   - Added `!feeds[0]` check to satisfy strict null checking

**Result:** Overview page now reads from IndexedDB, enabling offline functionality. The server only handles auth/redirect logic, all data comes from the local database.
