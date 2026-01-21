---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/lib/local-db/database.ts
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CreateInviteSection.tsx
  - src/hooks/useSyncScheduler.ts
  - src/actions/babyActions.ts
---

# Baby Sharing Data Consistency

## Purpose
Documents IndexedDB sync patterns and data consistency strategies specific to the baby sharing system (invites, access requests, access records).

## Core Principle

**Server is source of truth, IndexedDB is optimistic cache.**

Sharing data follows same local-first patterns as other entities:
1. UI reads from IndexedDB (instant)
2. Actions write to server first
3. Server response updates IndexedDB immediately (optimistic)
4. Background sync confirms/corrects IndexedDB state

## IndexedDB Schema

**Sharing-related tables:**

```typescript
// Invite storage
babyInvites: EntityTable<LocalBabyInvite, 'id'>;

// Access records (who has access to which baby)
babyAccess: EntityTable<LocalBabyAccess, 'userId'>;

// Access requests (pending approval)
accessRequests: EntityTable<LocalAccessRequest, 'id'>; // Not shown in provided code
```

**Indexes:**
```typescript
{
  babyInvites: 'id, babyId, status, inviteType, [babyId+status]',
  babyAccess: '[userId+babyId], userId, babyId',
}
```

**Why compound indexes:** Enable efficient queries without full table scans.

## Pattern 1: Immediate Insert After Server Action

**Use case:** Creating a new invite

**Flow:**
```typescript
// 1. Call server action
const result = await createBabyInvitePasskey(babyId, 'editor');

if (!result.success) {
  // Show error, don't insert
  return;
}

// 2. Immediately insert into IndexedDB
await localDb.babyInvites.add({
  id: result.invite.id,              // Server-generated ID
  babyId: numericBabyId,
  code: result.invite.code,
  inviteType: 'passkey',
  accessLevel: 'editor',
  status: 'pending',
  createdAt: new Date(result.invite.createdAt),
  expiresAt: new Date(result.invite.expiresAt),
});
```

**Why immediate insert:**
- UI uses `useLiveQuery` on `babyInvites` table
- Insert triggers reactive update
- No need to wait for next sync pull

**Alternative (slower):**
```typescript
// Don't do this for invite creation:
await createBabyInvitePasskey(babyId, 'editor');
// User sees no change until next sync (poor UX)
```

**When to use immediate insert:**
- Creating new entities (invites, access requests)
- User expects instant feedback
- Server action returns full entity object

**When NOT to use immediate insert:**
- Updating existing entities (sync will handle it)
- Server action doesn't return entity data
- Conflict resolution needed (use sync)

## Pattern 2: Compound Index Queries

**Use case:** Fetch pending invites for a baby

**Efficient query:**
```typescript
const pendingInvites = await localDb.babyInvites
  .where('[babyId+status]')
  .equals([babyId, 'pending'])
  .toArray();
```

**Why compound index:** Single index lookup, very fast.

**Inefficient alternative:**
```typescript
// Don't do this:
const pendingInvites = await localDb.babyInvites
  .where('babyId')
  .equals(babyId)
  .filter(invite => invite.status === 'pending')
  .toArray();
```

**Why inefficient:** Fetches all baby's invites, then filters in-memory (slow with many invites).

**Other compound queries:**

**User's access to baby:**
```typescript
const access = await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([userId, babyId])
  .first();
```

**All caregivers for baby:**
```typescript
const caregivers = await localDb.babyAccess
  .where('babyId')
  .equals(babyId)
  .toArray();
```

**Performance tip:** Always use indexed fields for `where()` clauses, not `filter()`.

## Pattern 3: Reactive UI with useLiveQuery

**Use case:** Display pending invites list

**Component:**
```typescript
const pendingInvites = useLiveQuery(async () => {
  return localDb.babyInvites
    .where('[babyId+status]')
    .equals([babyId, 'pending'])
    .toArray();
}, [babyId]);

if (!pendingInvites) {
  return <Loading />; // undefined during first query
}

return (
  <ul>
    {pendingInvites.map(invite => (
      <li key={invite.id}>{invite.code}</li>
    ))}
  </ul>
);
```

**Automatic updates:**
- When invite created → list re-renders with new invite
- When invite revoked → list re-renders without invite
- When sync updates status → list re-renders

**Why no polling:** IndexedDB triggers re-query on any table change (zero network cost).

**Common mistake:**
```typescript
// Don't do this:
const [invites, setInvites] = useState([]);

useEffect(() => {
  localDb.babyInvites.toArray().then(setInvites);
}, []); // Never updates!
```

**Why broken:** No reactivity - changes to IndexedDB don't trigger re-fetch.

## Pattern 4: Transaction-Based Cleanup

**Use case:** Revoking access removes all related data

**Atomic cleanup:**
```typescript
await localDb.transaction('rw', [
  localDb.babyAccess,
  localDb.babies,
  localDb.feedLogs,
  localDb.sleepLogs,
  localDb.nappyLogs,
  localDb.outbox,
], async () => {
  // 1. Delete access record
  await localDb.babyAccess
    .where('[userId+babyId]')
    .equals([userId, babyId])
    .delete();

  // 2. Check if other users have access
  const otherAccess = await localDb.babyAccess
    .where('babyId')
    .equals(babyId)
    .count();

  // 3. If no other users, delete baby and logs
  if (otherAccess === 0) {
    await localDb.babies.delete(babyId);
    await localDb.feedLogs.where('babyId').equals(babyId).delete();
    await localDb.sleepLogs.where('babyId').equals(babyId).delete();
    await localDb.nappyLogs.where('babyId').equals(babyId).delete();
  }

  // 4. Delete pending mutations
  await localDb.outbox
    .filter(m => /* baby-related */)
    .delete();
});
```

**Why transaction:** Ensures all-or-nothing (no partial cleanup if error occurs).

**Multi-user safety:** Check `otherAccess` prevents deleting shared baby data.

## Pattern 5: Bootstrap Sync Coordination

**Bootstrap API returns all access-related data:**

```typescript
// GET /api/account/bootstrap
{
  babies: Baby[],
  babyAccess: BabyAccess[],
  pendingInvites: BabyInvite[],     // For current user's email
  accessRequests: AccessRequest[],   // Created by user
  // ... other data
}
```

**Bootstrap stores all data in IndexedDB:**
```typescript
await localDb.transaction('rw', [
  localDb.babies,
  localDb.babyAccess,
  localDb.babyInvites,
], async () => {
  await localDb.babies.bulkPut(bootstrapData.babies);
  await localDb.babyAccess.bulkPut(bootstrapData.babyAccess);
  await localDb.babyInvites.bulkPut(bootstrapData.pendingInvites);
});
```

**Why bootstrap includes invites:** User may have pending invites for email-based acceptance.

**Sync after acceptance:**
- User accepts invite with code
- Client redirects to `/account/bootstrap`
- Bootstrap re-runs, fetches updated `babyAccess`
- IndexedDB updated with new access record
- UI shows newly accessible baby

## Pattern 6: Server Validation Prevents Conflicts

**All server actions validate:**

```typescript
// Example: acceptInviteByCode
// 1. Verify invite exists and not expired
// 2. Verify invite not already used
// 3. Verify user not already caregiver
// 4. Create baby_access record
// 5. Mark invite as accepted
```

**Why critical:** Prevents race conditions (e.g., two users accepting same invite).

**Client-side optimism is safe:**
- Client inserts into IndexedDB immediately
- If server rejects, error shown and UI corrects
- Sync will eventually fix any inconsistencies

**Example error scenario:**
1. User A accepts invite (succeeds)
2. User B accepts same invite (fails - already used)
3. User B sees error, no IndexedDB insert
4. Next sync confirms User A has access, User B doesn't

## Sync Timing

**Sharing data synced via:**

1. **Bootstrap:** On login/page load (full sync)
2. **Background sync:** Every 30 seconds (delta updates)
3. **Manual trigger:** After critical actions (accept invite, revoke access)

**Sync scheduler integration:**
```typescript
// useSyncScheduler hook (from local-first system)
const { syncNow } = useSyncScheduler();

// After accepting invite
await acceptInviteByCode(code);
syncNow(); // Force immediate sync (don't wait 30s)
```

**When to trigger manual sync:**
- After accepting invite (need baby data immediately)
- After revoking access (confirm server processed)
- After resolving conflict (get latest state)

## Conflict Resolution

**Baby sharing uses Last-Write-Wins (LWW):**

**Example conflict:**
1. Owner changes caregiver role to 'viewer' (offline)
2. Meanwhile, server removed caregiver access
3. When online, client pushes role change
4. Server rejects (no access record exists)
5. Sync pulls server state, removes local access record

**Resolution:** Server always wins (it's source of truth).

**Why safe for sharing:** Access changes are infrequent, conflicts unlikely.

## Gotchas

1. **Don't forget compound index order:** `[userId+babyId]` ≠ `[babyId+userId]` - use exact schema order.

2. **Immediate insert requires full object:** Server action must return complete entity (not just ID).

3. **Transaction for multi-table updates:** Use transactions for cleanup to prevent partial state.

4. **useLiveQuery returns undefined first:** Always check `if (!data) return <Loading />`.

5. **Bootstrap redirect critical:** After accepting invite, MUST redirect to bootstrap (not just manual sync).

6. **Check otherAccess before deleting baby:** Multi-user devices need this safety check.

## Performance Metrics

**Typical query times (IndexedDB):**
- Compound index query: <1ms
- Full table filter: 10-50ms (depends on size)
- Transaction commit: 5-10ms

**Why fast:** IndexedDB is in-memory cache (no network), indexes are pre-computed.

**Optimization tips:**
- Use compound indexes for common queries
- Batch updates in transactions (single commit)
- Avoid full-table scans with `toArray().filter()`
- Use `first()` instead of `toArray()[0]` (stops after first match)

## Related Files

**Database:**
- `src/lib/local-db/database.ts` - Schema and indexes

**Sync:**
- `src/hooks/useSyncScheduler.ts` - Background sync scheduler
- `src/app/api/account/bootstrap/route.ts` - Bootstrap API

**Components:**
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CreateInviteSection.tsx` - Immediate insert pattern
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PendingInvitesSection.tsx` - Compound index query + useLiveQuery

**Actions:**
- `src/actions/babyActions.ts` - All sharing-related server actions with validation
