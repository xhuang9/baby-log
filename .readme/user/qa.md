# Q&A: Local Database Architecture

---

## Q1: How should `local-db.ts` be refactored for better organization?

### Current Issues
The file has grown to 600+ lines mixing:
- Type definitions (entity types, enums)
- Database class definition
- Helper functions for each entity type
- Sync/outbox management

### Recommended Structure

Split into a `local-db/` directory:

```
src/lib/local-db/
├── index.ts              # Re-exports everything (public API)
├── database.ts           # Dexie class definition + singleton
├── types/
│   ├── index.ts          # Re-exports all types
│   ├── entities.ts       # LocalUser, LocalBaby, LocalBabyAccess
│   ├── logs.ts           # LocalFeedLog, LocalSleepLog, LocalNappyLog
│   ├── sync.ts           # SyncMeta, SyncStatus, SyncEntityType
│   └── outbox.ts         # OutboxEntry, OutboxEntityType, etc.
└── helpers/
    ├── index.ts          # Re-exports all helpers
    ├── user.ts           # getLocalUser, saveLocalUser, etc.
    ├── baby.ts           # saveBabies, getAllLocalBabies, etc.
    ├── feed-logs.ts      # saveFeedLogs, getFeedLogsForBaby, etc.
    ├── sleep-logs.ts     # saveSleepLogs, getSleepLogsForBaby, etc.
    ├── nappy-logs.ts     # saveNappyLogs, getNappyLogsForBaby, etc.
    ├── ui-config.ts      # getUIConfig, updateUIConfig
    ├── sync-status.ts    # getSyncStatus, updateSyncStatus, etc.
    └── outbox.ts         # addToOutbox, getPendingOutboxEntries, etc.
```

### Benefits
1. **Easier navigation** - Find code by domain
2. **Better tree-shaking** - Unused helpers won't bundle
3. **Parallel development** - Multiple devs can work on different log types
4. **Clear boundaries** - Types vs. runtime code separated

### Example `index.ts` (public API)
```typescript
// Types
export * from './types';

// Database instance
export { localDb } from './database';

// Helpers - grouped by domain
export * from './helpers/user';
export * from './helpers/baby';
export * from './helpers/feed-logs';
export * from './helpers/sleep-logs';
export * from './helpers/nappy-logs';
export * from './helpers/ui-config';
export * from './helpers/sync-status';
export * from './helpers/outbox';
```

---

## Q2: Should `local-db.ts` be moved to `models/` next to `Schema.ts`?

### Short Answer: **No, keep them separate.**

### Reasoning

| Aspect | `models/Schema.ts` | `lib/local-db/` |
|--------|-------------------|-----------------|
| **Runtime** | Server-side (Node.js) | Client-side (Browser) |
| **Database** | Postgres (Neon) | IndexedDB (Dexie) |
| **Purpose** | Source of truth | Local cache/offline |
| **Dependencies** | drizzle-orm, pg | dexie |

### Why Separation is Better

1. **Different runtimes** - Schema.ts uses Node.js APIs (drizzle-kit, pg). local-db uses browser APIs (IndexedDB). Mixing them risks accidental server code in client bundles.

2. **Different concerns** - Schema.ts defines *canonical* data structure. local-db defines *cached* data structure. They mirror each other but serve different purposes.

3. **Tree-shaking** - Keeping local-db in `lib/` ensures it's only bundled in client code. Putting it in `models/` might accidentally pull it into server actions.

4. **Conventions** - `models/` typically means "server-side data models" in Next.js projects. `lib/` is for client utilities.

### Alternative: Create a Shared Types Package

If you want types to be shared between server and client:

```
src/
├── models/
│   └── Schema.ts           # Postgres schema (server)
├── lib/
│   └── local-db/           # Dexie setup (client)
└── types/
    └── entities.ts         # Shared TypeScript types (both)
```

Then both Schema.ts and local-db can import from `@/types/entities`.

---

## Q3: How does Dexie.js versioning work?

### Overview

Dexie uses **version numbers** to handle IndexedDB schema migrations. When you change the database structure (add tables, modify indexes), you increment the version.

### Current Implementation

```typescript
class BabyLogDatabase extends Dexie {
  constructor() {
    super('baby-log');

    // Version 1: Initial schema
    this.version(1).stores({
      feedLogs: 'id, babyId, startedAt, createdAt',
      babies: 'id',
      // ...
    });

    // Version 2: Add user, uiConfig, syncStatus tables
    this.version(2).stores({
      feedLogs: 'id, babyId, startedAt, createdAt',
      users: 'id, clerkId',        // NEW
      uiConfig: 'userId',           // NEW
      syncStatus: 'entityType',     // NEW
      // ...
    });

    // Version 3: Add sleepLogs and nappyLogs
    this.version(3).stores({
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',  // CHANGED index
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]', // NEW
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]', // NEW
      // ...
    });
  }
}
```

### How It Works

1. **On first visit** - Dexie creates the database at the latest version (v3).

2. **On return visit (same version)** - Dexie opens existing database, no migration.

3. **On return visit (old version)** - Dexie runs migrations sequentially:
   - User has v1 → runs v1→v2, then v2→v3
   - User has v2 → runs v2→v3

### Key Rules

| Rule | Description |
|------|-------------|
| **Never delete old versions** | Keep all version definitions for users who haven't upgraded |
| **Only add to latest version** | New tables/indexes go in a new version |
| **Version numbers are integers** | Must be positive integers (1, 2, 3...) |
| **Indexes are additive** | Adding an index is safe, removing requires data migration |

### Data Migration Example

If you need to transform data during upgrade:

```typescript
this.version(4).stores({
  feedLogs: 'id, babyId, startedAt, [babyId+startedAt], method', // NEW index
}).upgrade(tx => {
  // Transform existing data
  return tx.table('feedLogs').toCollection().modify(log => {
    // Example: Set default value for new field
    if (!log.method) {
      log.method = 'bottle';
    }
  });
});
```

### When to Increment Version

| Change Type | New Version? |
|-------------|--------------|
| Add new table | Yes |
| Add new index to existing table | Yes |
| Remove index | Yes (data preserved) |
| Remove table | Yes (data lost!) |
| Add new non-indexed field to type | No* |
| Change TypeScript type | No* |

*TypeScript type changes don't affect IndexedDB - it stores plain objects.

### Debugging Versions

```typescript
// Check current version in browser console
const db = await Dexie.open('baby-log');
console.log('Current version:', db.verno);
db.close();

// Or clear and restart fresh (dev only!)
await Dexie.delete('baby-log');
```

### Common Pitfalls

1. **Don't edit old versions** - Users on v1 need the original v1 definition to upgrade properly.

2. **Don't skip versions** - Go 1→2→3, not 1→3.

3. **Test upgrades** - Create test data at v1, then verify v3 migration works.

4. **Handle failures** - Wrap upgrade logic in try/catch:
   ```typescript
   .upgrade(async tx => {
     try {
       await tx.table('feedLogs').toCollection().modify(...);
     } catch (e) {
       console.error('Migration failed:', e);
       // Don't throw - let database open with partial migration
     }
   });
   ```

---

## Summary

| Question | Answer |
|----------|--------|
| Refactor local-db.ts? | Yes - split into `local-db/` directory with types and helpers |
| Move to models/? | No - keep separate due to different runtimes (server vs client) |
| Dexie versioning | Increment version for schema changes; keep all old versions; use `.upgrade()` for data transforms |
