# Adding New Log Types

This guide documents the process for adding a new activity log type (e.g., solids_log, bath_log).

---

## Overview

Log types share a common pattern:
- Postgres table with `babyId`, `loggedByUserId`, `startedAt`, timestamps
- Optional `endedAt` for duration-based logs (feed, sleep)
- No `endedAt` for instant events (nappy, solids)
- Type-specific fields as needed

---

## Files to Modify

### 1. Postgres Schema

**File:** `src/models/Schema.ts`

Add enum (if needed) and table definition:

```typescript
// Add enum if the log has a type field
export const solidsFoodTypeEnum = pgEnum('solids_food_type_enum', [
  'fruit',
  'vegetable',
  'grain',
  'protein',
  'dairy',
]);

// Add table after existing log tables
export const solidsLogSchema = pgTable('solids_log', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  loggedByUserId: integer('logged_by_user_id').references(() => userSchema.id).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  foodType: solidsFoodTypeEnum('food_type'),
  foodName: text('food_name'),
  amount: text('amount'), // e.g., 'taste', 'some', 'full'
  reaction: text('reaction'), // e.g., 'loved', 'neutral', 'disliked'
  notes: text('notes'),
  ...timestamps,
}, t => [
  index('solids_log_baby_started_at_idx').on(t.babyId, t.startedAt),
]);
```

**Run migration:**
```bash
npm run db:generate
npm run db:migrate
```

---

### 2. Dexie Local Database

**File:** `src/lib/local-db.ts`

**Step 2a:** Add the local type:

```typescript
export type LocalSolidsLog = {
  id: string;  // UUID - client-generated
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  foodType: 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy' | null;
  foodName: string | null;
  amount: string | null;
  reaction: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

**Step 2b:** Add to sync entity type:

```typescript
export type SyncEntityType =
  | 'user'
  | 'babies'
  // ... existing types
  | 'solids_logs';  // Add new type
```

**Step 2c:** Add to outbox entity type:

```typescript
export type OutboxEntityType =
  | 'feed_log'
  | 'sleep_log'
  | 'nappy_log'
  | 'solids_log';  // Add new type
```

**Step 2d:** Add table to Dexie class:

```typescript
class BabyLogDatabase extends Dexie {
  // ... existing tables
  solidsLogs!: EntityTable<LocalSolidsLog, 'id'>;

  constructor() {
    super('baby-log');

    // Increment version number
    this.version(X).stores({
      // ... existing tables
      solidsLogs: 'id, babyId, startedAt, [babyId+startedAt]',
    });
  }
}
```

**Step 2e:** Add helper functions:

```typescript
export async function saveSolidsLogs(logs: LocalSolidsLog[]): Promise<void> {
  await localDb.solidsLogs.bulkPut(logs);
}

export async function getSolidsLogsForBaby(
  babyId: number,
  limit?: number
): Promise<LocalSolidsLog[]> {
  let query = localDb.solidsLogs
    .where('babyId')
    .equals(babyId)
    .reverse();

  if (limit) {
    query = query.limit(limit);
  }

  return query.sortBy('startedAt');
}

export async function getSolidsLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalSolidsLog[]> {
  return localDb.solidsLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();
}
```

**Step 2f:** Update `clearAllLocalData()`:

```typescript
export async function clearAllLocalData(): Promise<void> {
  await localDb.transaction('rw', [
    // ... existing tables
    localDb.solidsLogs,
  ], async () => {
    // ... existing clears
    await localDb.solidsLogs.clear();
  });
}
```

---

### 3. Initial Sync Service

**File:** `src/services/initial-sync.ts`

**Step 3a:** Add to `InitialSyncData`:

```typescript
export type InitialSyncData = {
  user: LocalUser;
  babies: LocalBaby[];
  babyAccess: LocalBabyAccess[];
  recentFeedLogs: LocalFeedLog[];
  recentSleepLogs: LocalSleepLog[];
  recentNappyLogs: LocalNappyLog[];
  recentSolidsLogs: LocalSolidsLog[];  // Add
  uiConfig: Partial<LocalUIConfig> | null;
};
```

**Step 3b:** Add to server response type and transform function.

**Step 3c:** Update `storeInitialSyncData()`:

```typescript
await saveSolidsLogs(data.recentSolidsLogs);
await updateSyncStatus('solids_logs', 'complete');
```

---

### 4. Bootstrap API

**File:** `src/app/[locale]/api/bootstrap/route.ts` (when created)

Include recent logs in the response:

```typescript
// Fetch recent solids logs (last 7 days)
const recentSolidsLogs = await db
  .select()
  .from(solidsLogSchema)
  .where(
    and(
      inArray(solidsLogSchema.babyId, babyIds),
      gte(solidsLogSchema.startedAt, sevenDaysAgo),
    ),
  )
  .orderBy(desc(solidsLogSchema.startedAt));
```

---

### 5. React Hook

**File:** `src/hooks/useSolidsLogs.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';

export function useSolidsLogs(babyId: number | null, limit?: number) {
  return useLiveQuery(
    async () => {
      if (!babyId) return [];

      let query = localDb.solidsLogs
        .where('babyId')
        .equals(babyId)
        .reverse();

      if (limit) {
        query = query.limit(limit);
      }

      return query.sortBy('startedAt');
    },
    [babyId, limit],
    []
  );
}
```

---

### 6. Server Actions (for mutations)

**File:** `src/actions/solidsActions.ts`

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { solidsLogSchema, userSchema } from '@/models/Schema';

export async function createSolidsLog(data: {
  babyId: number;
  foodType?: string;
  foodName?: string;
  amount?: string;
  reaction?: string;
  notes?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  // Get local user ID
  const [user] = await db
    .select()
    .from(userSchema)
    .where(eq(userSchema.clerkId, userId))
    .limit(1);

  if (!user) throw new Error('User not found');

  const [log] = await db
    .insert(solidsLogSchema)
    .values({
      babyId: data.babyId,
      loggedByUserId: user.id,
      foodType: data.foodType,
      foodName: data.foodName,
      amount: data.amount,
      reaction: data.reaction,
      notes: data.notes,
    })
    .returning();

  return log;
}
```

---

### 7. UI Config (optional)

**File:** `src/lib/local-db.ts`

If the log type should be toggleable in dashboard:

```typescript
export type LocalUIConfig = {
  // ... existing fields
  dashboardVisibility: {
    feed: boolean;
    sleep: boolean;
    nappy: boolean;
    solids: boolean;  // Add
    // ...
  };
};
```

---

## Checklist

When adding a new log type:

- [ ] **Schema.ts**: Add enum (if needed) and table definition
- [ ] **Run**: `npm run db:generate` and `npm run db:migrate`
- [ ] **local-db.ts**: Add `Local{Type}Log` type
- [ ] **local-db.ts**: Add to `SyncEntityType`
- [ ] **local-db.ts**: Add to `OutboxEntityType`
- [ ] **local-db.ts**: Add table to Dexie class (increment version)
- [ ] **local-db.ts**: Add helper functions (save, get, getByDateRange)
- [ ] **local-db.ts**: Update `clearAllLocalData()`
- [ ] **initial-sync.ts**: Add to `InitialSyncData` type
- [ ] **initial-sync.ts**: Update `storeInitialSyncData()`
- [ ] **Bootstrap API**: Include in response
- [ ] **React hook**: Create `use{Type}Logs.ts`
- [ ] **Server actions**: Create `{type}Actions.ts`
- [ ] **UI**: Add dashboard tile/component

---

## Current Log Types

| Type | Table | Has endedAt | Enum |
|------|-------|-------------|------|
| Feed | `feed_log` | Yes | - |
| Sleep | `sleep_log` | Yes | - |
| Nappy | `nappy_log` | No | `nappy_type_enum` |
