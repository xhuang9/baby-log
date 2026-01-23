---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/services/sync-service.ts
  - src/hooks/useSyncScheduler.ts
  - src/lib/local-db/helpers/access-revoked.ts
  - src/lib/local-db/helpers/index.ts
---

# Access Revocation Handling

## Purpose

Automatic detection and cleanup when a caregiver's access to a baby is revoked. The system detects 403 responses from sync endpoints, removes all local data for the revoked baby, updates UI state, and notifies the user.

## Why This Exists

When a baby owner removes a caregiver's access:
- The revoked user still has baby data in local IndexedDB
- Attempting to sync or mutate that baby returns 403
- Without cleanup, the app shows stale data and confusing errors
- User experience degrades with "stuck" sync failures

This system ensures clean, immediate handling of access revocation with user-friendly notifications.

## Architecture Flow

```
Owner removes caregiver
  → Server: Access removed from baby_access table
  → Revoked user attempts sync/mutation
  → Server: Returns 403 Forbidden
  → Client: Detects 403
  → Client: Calls clearRevokedBabyData(babyId, userId)
  → IndexedDB: Deletes all baby-related data
  → Zustand: Removes baby from allBabies, switches activeBaby
  → UI: Shows toast notification
  → UI: Invalidates queries, refreshes views
```

## Implementation

### 1. Server-Side: 403 Response

Both sync endpoints return 403 when access is denied:

**Pull endpoint** (`/api/sync/pull`):
```typescript
// Check access
const access = await db
  .select()
  .from(babyAccessSchema)
  .where(
    and(
      eq(babyAccessSchema.userId, localUser.id),
      eq(babyAccessSchema.babyId, babyId)
    )
  )
  .limit(1);

if (access.length === 0) {
  return NextResponse.json(
    { error: 'Access denied' },
    { status: 403 }
  );
}
```

**Push endpoint** (`/api/sync/push`):
```typescript
// Verify access for each mutation
const access = await verifyBabyAccess(localUser.id, babyId);
if (!access) {
  return NextResponse.json(
    { error: 'Access denied to baby' },
    { status: 403 }
  );
}
```

### 2. Client Detection: Sync Service

The sync service detects 403 responses and triggers cleanup:

**File:** `src/services/sync-service.ts`

```typescript
// In pullChanges()
if (response.status === 403) {
  const userId = useUserStore.getState().user?.localId;
  if (userId) {
    await clearRevokedBabyData(babyId, userId);
  }
  return {
    success: false,
    error: 'Access to this baby has been revoked',
    errorType: 'access_revoked',
    revokedBabyId: babyId,
  };
}

// In flushOutbox()
if (response.status === 403) {
  const userId = useUserStore.getState().user?.localId;
  if (userId) {
    // Extract affected baby IDs from pending mutations
    const affectedBabyIds = new Set<number>();
    for (const mutation of pending) {
      if (mutation.entityType === 'baby') {
        affectedBabyIds.add(Number.parseInt(mutation.entityId, 10));
      } else {
        const payload = mutation.payload as { babyId?: number };
        if (payload.babyId) {
          affectedBabyIds.add(payload.babyId);
        }
      }
    }

    // Clear data for each affected baby
    for (const babyId of affectedBabyIds) {
      await clearRevokedBabyData(babyId, userId);
    }

    return {
      success: false,
      error: 'Access to baby has been revoked',
      errorType: 'access_revoked',
      revokedBabyId: affectedBabyIds.values().next().value,
    };
  }
}
```

### 3. Data Cleanup: clearRevokedBabyData

Comprehensive IndexedDB cleanup for revoked access:

**File:** `src/lib/local-db/helpers/access-revoked.ts`

```typescript
export async function clearRevokedBabyData(
  babyId: number,
  userId: number
): Promise<void> {
  await localDb.transaction('rw', [
    localDb.babies,
    localDb.babyAccess,
    localDb.feedLogs,
    localDb.sleepLogs,
    localDb.nappyLogs,
    localDb.outbox,
  ], async () => {
    // Delete baby access record
    await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([userId, babyId])
      .delete();

    // Delete activity logs
    await localDb.feedLogs.where({ babyId }).delete();
    await localDb.sleepLogs.where({ babyId }).delete();
    await localDb.nappyLogs.where({ babyId }).delete();

    // Clear pending mutations
    await localDb.outbox
      .where('entityId')
      .equals(String(babyId))
      .delete();

    // If no other users have access, delete baby
    const remainingAccess = await localDb.babyAccess
      .where('babyId')
      .equals(babyId)
      .count();

    if (remainingAccess === 0) {
      await localDb.babies.where({ id: babyId }).delete();
    }
  });
}
```

**Cleanup actions:**
1. Delete baby_access record for this user+baby
2. Delete all feed/sleep/nappy logs for this baby
3. Delete pending outbox mutations for this baby
4. If no other users have access, delete baby record entirely

**Export location:** `src/lib/local-db/helpers/index.ts`

### 4. UI Updates: useSyncScheduler Hook

The sync scheduler hook handles UI state updates and notifications:

**File:** `src/hooks/useSyncScheduler.ts`

```typescript
// In useSyncScheduler (single baby)
if (result.errorType === 'access_revoked') {
  setLastError(result.error ?? 'Access revoked');

  // Remove revoked baby from allBabies
  const updatedBabies = allBabies.filter(
    b => b.babyId !== result.revokedBabyId
  );
  setAllBabies(updatedBabies);

  // Switch active baby if needed
  if (activeBaby?.babyId === result.revokedBabyId) {
    const nextBaby = updatedBabies[0] ?? null;
    if (nextBaby) {
      setActiveBaby(nextBaby);
    }
  }

  // Show user notification
  toast.error('Access Revoked', {
    description: 'Your access to this baby has been removed by the owner.',
  });

  // Invalidate all queries to refresh UI
  queryClient.invalidateQueries();
}

// In useMultiBabySync (multiple babies)
if (result.errorType === 'access_revoked' && result.revokedBabyId) {
  const currentBabies = useBabyStore.getState().allBabies;
  const updatedBabies = currentBabies.filter(
    b => b.babyId !== result.revokedBabyId
  );
  setAllBabies(updatedBabies);

  const currentActive = useBabyStore.getState().activeBaby;
  if (currentActive?.babyId === result.revokedBabyId) {
    const nextBaby = updatedBabies[0] ?? null;
    if (nextBaby) {
      setActiveBaby(nextBaby);
    }
  }

  toast.error('Access Revoked', {
    description: 'Your access to this baby has been removed by the owner.',
  });
}
```

**UI updates:**
1. Remove revoked baby from `allBabies` in Zustand store
2. If active baby was revoked, switch to next available baby
3. Show toast notification with error message
4. Invalidate TanStack Query cache to refresh all views

## Trigger Points

Access revocation handling runs in two scenarios:

### Scenario 1: Pull Sync (Background Polling)

- `useSyncScheduler` polls `/api/sync/pull` every 5 seconds
- Server returns 403 → sync service detects → cleanup runs
- Common case: User is viewing app when owner removes access

### Scenario 2: Outbox Flush (Mutation Attempt)

- User attempts to create/update activity log
- Operation added to outbox
- `flushOutbox` posts to `/api/sync/push`
- Server returns 403 → sync service detects → cleanup runs
- Common case: User was offline, access revoked while offline, comes online and tries to sync

### Scenario 3: Coming Back Online

- `useMultiBabySync` calls `flushOutbox` when network reconnects
- If any pending mutations have revoked access → cleanup runs
- Ensures stale data doesn't persist after reconnection

## User Experience Flow

From user's perspective:

1. **Before revocation:**
   - User has access to baby "Emma"
   - App shows Emma's activity logs
   - Sync running in background every 5s

2. **Owner removes access:**
   - Owner clicks "Remove" in caregiver management
   - Server deletes baby_access record

3. **User's next sync (5s later):**
   - Pull sync attempts to fetch changes
   - Server returns 403
   - Toast appears: "Access Revoked - Your access to this baby has been removed by the owner."
   - Baby list updates, Emma disappears
   - If Emma was active, app switches to next available baby (or shows empty state)
   - All Emma's data removed from local IndexedDB

4. **Result:**
   - Clean, immediate transition
   - No orphaned data
   - No confusing error states
   - User understands what happened

## Error Result Shape

The sync service returns a structured error for access revocation:

```typescript
type SyncResult = {
  success: boolean;
  error?: string;
  errorType?: 'access_revoked' | 'network' | 'unknown';
  revokedBabyId?: number;
  changesApplied?: number;
};

// Example revocation result:
{
  success: false,
  error: 'Access to this baby has been revoked',
  errorType: 'access_revoked',
  revokedBabyId: 123,
}
```

The `errorType` discriminator enables special handling vs generic errors.

## Related

- `.readme/chunks/baby-sharing.access-revocation.md` - Access revocation system overview
- `.readme/chunks/local-first.delta-sync-client.md` - Sync scheduler and hooks
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox mutation queueing
- `.readme/chunks/baby-sharing.caregiver-management.md` - UI for removing caregivers
