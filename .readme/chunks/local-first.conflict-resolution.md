---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - .readme/task/llm-chat-correction.md
  - .readme/task/architecture.folder-structure.plan.md
---

# Last-Write-Wins (LWW) Conflict Resolution

## Purpose
Documents the deliberate choice of Last-Write-Wins (LWW) conflict resolution strategy over complex per-field merging. This is a project-specific architectural decision based on product requirements.

## Key Deviations from Standard

Unlike sophisticated offline-first systems (CRDTs, operational transforms, version vectors):
- **No per-field merge logic** - entire record is replaced
- **Server timestamp wins** - client accepts server's version on conflict
- **No version gating** - no `version` field or conditional updates
- **Explicit simplicity trade-off** - accepts potential data loss for implementation speed

## Rationale

### Why LWW is Acceptable for Baby Tracking

1. **Single Caregiver Editing is Common**
   - Most edits happen from one device at a time
   - Simultaneous edits to the same feed log are rare

2. **Low Stakes for Conflicts**
   - Losing a note field edit is recoverable
   - Not life-critical medical data requiring strict CRDT

3. **Vercel Deployment Constraint**
   - No WebSockets for real-time conflict detection
   - Pull-based sync simplifies architecture

4. **Development Velocity**
   - Complex merge logic requires significant engineering effort
   - LWW enables faster MVP delivery

**Explicitly Accepted Trade-off**: Rare concurrent edits may result in one edit being overwritten. This is acceptable for product scope.

## LWW Implementation Pattern

### Client Write → Server Sync → Client Update

```typescript
// 1. Client writes optimistically to Dexie
await localDb.feedLogs.update(feedLogId, {
  notes: 'Updated note',
  updatedAt: new Date(),
});

// 2. Add to outbox for server sync
await addToOutbox({
  mutationId: uuid(),
  entityType: 'feed_log',
  entityId: feedLogId,
  op: 'update',
  payload: { notes: 'Updated note' },
});

// 3. Flush outbox → send to server
const serverResponse = await fetch('/api/sync/mutations', { /* ... */ });

// 4. Server returns canonical version (with server timestamp)
const serverData = await serverResponse.json();

// 5. Client REPLACES local version with server version (LWW)
await localDb.feedLogs.put({
  ...serverData,
  updatedAt: new Date(serverData.updated_at), // Server timestamp wins
});
```

**Key Point**: Step 5 overwrites client's optimistic update with server's canonical version.

## Server Timestamp Wins

### Server Side (Authoritative)

```sql
-- Server always sets updated_at to NOW()
UPDATE feed_logs
SET
  notes = $1,
  updated_at = NOW()  -- Server timestamp
WHERE id = $2;
```

### Client Side (Accept)

```typescript
// Client accepts server timestamp unconditionally
await localDb.feedLogs.put({
  ...serverData,
  updatedAt: new Date(serverData.updated_at), // No comparison, just accept
});
```

**Why**: Server is canonical truth. Client is a cache. Cache defers to source.

## Conflict Scenario Example

### Scenario: Two Devices Edit Same Feed Log

**Device A** (offline):
```typescript
// t1: Update notes field
await localDb.feedLogs.update(feedLogId, {
  notes: 'Device A note',
  updatedAt: new Date('2025-01-09T10:00:00Z'),
});
```

**Device B** (online):
```typescript
// t2: Update notes field (syncs to server immediately)
await localDb.feedLogs.update(feedLogId, {
  notes: 'Device B note',
  updatedAt: new Date('2025-01-09T10:01:00Z'),
});
// Server sets updated_at = '2025-01-09T10:01:00Z'
```

**Device A** (comes online):
```typescript
// t3: Flushes outbox → sends 'Device A note' to server
// Server compares timestamps:
//   Server version: updated_at = '2025-01-09T10:01:00Z'
//   Client payload: updated_at = '2025-01-09T10:00:00Z'
// Server REJECTS stale update (or accepts and overwrites - depends on implementation)

// t4: Device A pulls changes from server
// Gets 'Device B note' with server timestamp '2025-01-09T10:01:00Z'
// Replaces local version

// Result: Device B's edit wins, Device A's edit is lost
```

**Accepted Trade-off**: Device A's edit is lost. User would need to notice and re-enter.

## No Version Gating

### What We Don't Do (Version Vector)

**Not Used**:
```typescript
// ❌ We do NOT track version numbers per entity
type LocalFeedLog = {
  id: string;
  version: number;  // ❌ NOT implemented
  // ...
};

// ❌ We do NOT conditionally update based on version
UPDATE feed_logs
SET notes = $1, version = version + 1
WHERE id = $2 AND version = $3; -- ❌ NOT used
```

### Why No Version Gating?

1. **Requires conflict UI**: User needs to resolve conflicts manually
2. **Increases complexity**: Track versions, handle conflict callbacks
3. **Rare benefit**: Conflicts are infrequent in this product

**Trade-off**: Accept occasional lost edits over complex conflict resolution UX.

## Patterns

### Pull Sync Overwrites Local Changes

```typescript
// Pull changes from server (delta sync)
const changes = await fetch(`/api/babies/${babyId}/sync?since=${cursor}`);
const serverFeedLogs = await changes.json();

// Apply server changes to Dexie (LWW)
for (const serverLog of serverFeedLogs) {
  await localDb.feedLogs.put({
    ...serverLog,
    // Server version replaces local version unconditionally
  });
}
```

**Why `put` not `update`**: `put` replaces entire record (LWW). `update` would merge fields.

### Optimistic Update May Be Reverted

```typescript
// User clicks "Save" → optimistic update
await localDb.feedLogs.update(feedLogId, { notes: 'New note' });

// UI shows "New note" immediately (from Dexie)

// Background: Outbox flush sends to server
// Server may return different value (conflict or validation)
const serverResponse = await flushOutbox();

// UI updates again to show server value (may differ from optimistic)
await localDb.feedLogs.put(serverResponse.data);
// UI now shows server's version (optimistic update "reverted" if conflict)
```

**UX Implication**: User may see their edit briefly, then see it change to a different value. This is rare but possible.

## Future Improvements (Out of Scope for MVP)

If LWW becomes problematic, consider:

1. **Field-Level LWW**
   - Track `updatedAt` per field, not per record
   - Requires schema change: `{ notes_updated_at, amount_updated_at, ... }`

2. **Conflict Detection UI**
   - Warn user when their edit conflicts with server
   - Show diff: "Your version" vs "Server version"

3. **CRDT for Specific Fields**
   - Use CRDT for `notes` field (merge text edits)
   - Keep LWW for numeric fields (no meaningful merge)

**Current Decision**: None of these are implemented. LWW is sufficient for MVP.

## Gotchas

### Don't Rely on Local `updatedAt` After Sync
**Wrong**:
```typescript
// ❌ Local updatedAt may be stale after sync
const localLog = await localDb.feedLogs.get(feedLogId);
console.log(localLog.updatedAt); // May be older than server version
```

**Right**:
```typescript
// ✅ Always pull from server to get authoritative timestamp
const serverLog = await fetch(`/api/feedLogs/${feedLogId}`);
const canonicalTimestamp = serverLog.updated_at;
```

### Concurrent Edits are Silent
- No error or warning when LWW overwrites local change
- User may not notice their edit was lost
- **Mitigation**: Show sync status UI ("Synced 2 seconds ago")

## Related
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox replay pattern
- `.readme/chunks/local-first.dexie-schema.md` - No version field in schema
- `.readme/task/llm-chat-correction.md` - Full architectural discussion
