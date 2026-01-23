---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/lib/db/helpers/sync-events.ts
  - src/app/[locale]/api/sync/push/route.ts
  - src/actions/babyActions.ts
---

# Sync Event Helper

## Purpose

Centralized helper for writing sync events to the database. This helper provides a consistent interface for both server actions and API routes to record mutations, enabling multi-user synchronization via the cursor-based delta sync system.

## Why This Exists

Before this helper, every mutation site (API routes, server actions) had to manually insert sync events with verbose inline code. This led to:
- Code duplication across 12+ mutation sites
- Inconsistent sync event creation patterns
- Difficult maintenance and refactoring
- Risk of forgetting to record sync events for new mutations

The centralized helper solves these problems by providing a single source of truth for sync event creation.

## Implementation

### File Location

`src/lib/db/helpers/sync-events.ts`

### Core Functions

#### `writeSyncEvent(params: WriteSyncEventParams): Promise<number>`

Creates a sync event record in the database.

**Parameters:**
- `babyId`: The baby this mutation affects
- `entityType`: Type of entity ('baby' | 'feed_log' | 'sleep_log' | 'nappy_log')
- `entityId`: ID of the entity being mutated
- `op`: Operation type ('create' | 'update' | 'delete')
- `payload`: JSON payload with full entity data (or null for deletes)

**Returns:** The ID of the created sync event (used as the sync cursor)

**Usage pattern:**
```typescript
// In API routes or server actions
await writeSyncEvent({
  babyId: baby.id,
  entityType: 'baby',
  entityId: baby.id,
  op: 'update',
  payload: { name, birthDate, gender, updatedAt },
});
```

#### `getLatestSyncCursor(babyId: number): Promise<number>`

Gets the highest sync event ID for a baby.

**Purpose:** Initialize sync cursor for new caregivers so they don't pull entire history

**Returns:** Latest sync event ID, or 0 if none exist

**Usage pattern:**
```typescript
// When accepting an invite
const initialCursor = await getLatestSyncCursor(babyId);
await db.insert(babyAccessSchema).values({
  userId: localUser.id,
  babyId,
  accessLevel: invite.accessLevel,
  lastSyncCursor: initialCursor, // Start from current state
});
```

## Integration Points

### 1. Server Actions (babyActions.ts)

Baby mutations in server actions write sync events after updating the database:

```typescript
// Update baby
await db.update(babiesSchema)
  .set({ name, birthDate, gender, updatedAt: now })
  .where(eq(babiesSchema.id, babyId));

// Record sync event for other caregivers
await writeSyncEvent({
  babyId,
  entityType: 'baby',
  entityId: babyId,
  op: 'update',
  payload: { id: babyId, name, birthDate, gender, updatedAt: now.toISOString() },
});
```

**Key files:**
- `src/actions/babyActions.ts` - `createBaby`, `updateBaby`

### 2. Push API Route (Outbox Processing)

The `/api/sync/push` route processes client mutations from the outbox and writes sync events:

```typescript
// Apply mutation to database
const result = await applyMutation(mutation);

// Record sync event for other clients
await writeSyncEvent({
  babyId: result.babyId,
  entityType: mutation.entityType,
  entityId: mutation.entityId,
  op: mutation.op,
  payload: result.serverData,
});
```

This replaced 12+ inline `db.insert(syncEventsSchema)` calls with a single helper call.

**Key files:**
- `src/app/[locale]/api/sync/push/route.ts`

### 3. Invite Accept Actions

When accepting invites, `getLatestSyncCursor` initializes the sync cursor to current state:

```typescript
const initialCursor = await getLatestSyncCursor(babyId);

await db.insert(babyAccessSchema).values({
  userId: localUser.id,
  babyId,
  accessLevel: 'editor',
  lastSyncCursor: initialCursor, // Don't pull entire history
});

return {
  success: true,
  initialSyncCursor: initialCursor, // Client needs this for bootstrap
};
```

**Key files:**
- `src/actions/babyActions.ts` - `acceptInviteByCode`, `acceptInviteByToken`

## Why Sync Events Matter for Multi-User Sync

Without sync events:
- Caregiver A updates a baby's name
- Caregiver B has no way to know this update happened
- Baby data becomes stale and inconsistent

With sync events:
- Caregiver A updates baby → sync event recorded
- Caregiver B polls `/api/sync/pull` → sees sync event → applies update locally
- Near-real-time consistency (5s polling interval)

## Migration Notes

This helper was introduced as part of the "Sync Between Users" feature. Previously:
- Only push API route recorded sync events (via inline inserts)
- Server actions did NOT record sync events
- Result: Updates via server actions (e.g., editing baby in settings) didn't sync to other caregivers

After migration:
- Both API routes AND server actions use `writeSyncEvent`
- All mutations sync to all caregivers
- Reduced code duplication from 200+ lines to single helper

## Related

- `.readme/chunks/local-first.delta-sync-architecture.md` - Cursor-based sync system overview
- `.readme/chunks/local-first.delta-sync-api.md` - Push API endpoint details
- `.readme/chunks/local-first.operations-layer.md` - Client-side mutation patterns
