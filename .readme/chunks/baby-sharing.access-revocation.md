---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/hooks/useAccessRevocationDetection.ts
  - src/lib/local-db/helpers/access-revoked.ts
  - src/components/AccessRevokedModal.tsx
  - src/templates/AppShell.tsx
  - src/actions/babyActions.ts
---

# Access Revocation Detection

## Purpose
Automatically detects when a user's access to a baby has been revoked by monitoring outbox failures, then verifies with server and cleans up local data.

## Architecture Overview

**Problem:** When owner revokes caregiver access, the caregiver's app still has baby data in IndexedDB and may attempt mutations.

**Solution:** Three-layer detection and cleanup system:
1. Monitor outbox for "Access denied" errors
2. Verify access status with server
3. Clean up local data and redirect to bootstrap

## Implementation Layers

### Layer 1: Outbox Monitoring

**Hook:** `useAccessRevocationDetection.ts`

**Pattern:**
```typescript
const failedMutations = useLiveQuery(async () => {
  const failed = await localDb.outbox
    .where('status')
    .equals('failed')
    .filter(m => m.errorMessage?.includes('Access denied') ?? false)
    .toArray();
  return failed;
}, []);
```

**Trigger:** Reactive query updates when any outbox entry fails with "Access denied" message.

**Why this works:**
- Server actions throw "Access denied" error when user lacks permission
- Outbox captures all failed mutations with error messages
- `useLiveQuery` provides zero-latency updates when outbox changes

### Layer 2: Server Verification

**Action:** `verifyBabyAccess(babyId)` in `babyActions.ts`

**Flow:**
1. Query `baby_access` table for user's access record
2. Return `{ hasAccess: boolean, reason: 'no_access' | 'baby_not_found' }`
3. Hook uses result to determine if revocation is real or temporary error

**Why verify:** Prevents false positives from temporary server errors or network issues.

**Deduplication:**
```typescript
const checkedBabies = useRef<Set<number>>(new Set());

const checkBabyAccess = useCallback(async (babyId: number) => {
  if (checkedBabies.current.has(babyId) || isChecking) {
    return; // Skip if already checked
  }
  checkedBabies.current.add(babyId);
  // ... verification logic
}, [isChecking]);
```

**Why refs:** Prevents duplicate checks when multiple mutations fail for same baby.

### Layer 3: Local Data Cleanup

**Helper:** `clearRevokedBabyData(babyId, userId)` in `access-revoked.ts`

**Transaction-based cleanup:**
```typescript
await localDb.transaction('rw', [
  localDb.babies,
  localDb.babyAccess,
  localDb.feedLogs,
  localDb.sleepLogs,
  localDb.nappyLogs,
  localDb.outbox,
], async () => {
  // 1. Delete user's baby_access record
  await localDb.babyAccess
    .where('[userId+babyId]')
    .equals([userId, babyId])
    .delete();

  // 2. Check if other users still have access
  const otherAccess = await localDb.babyAccess
    .where('babyId')
    .equals(babyId)
    .count();

  // 3. If no other users, delete baby and all logs
  if (otherAccess === 0) {
    await localDb.babies.delete(babyId);
    await localDb.feedLogs.where('babyId').equals(babyId).delete();
    // ... other log types
  }

  // 4. Delete pending mutations for this baby
  await localDb.outbox.filter(m => /* baby-related */).delete();
});
```

**Critical pattern:** Use single transaction to ensure atomic cleanup (no partial state).

**Multi-user safety:** Only delete baby/logs if no other local users have access (handles device sharing).

## Store Updates

After cleanup, hook updates Zustand stores:

```typescript
// Remove from allBabies list
const remainingBabies = allBabies.filter(b => b.babyId !== babyId);
setAllBabies(remainingBabies);

// Clear activeBaby if it was the revoked one
if (activeBaby?.babyId === babyId) {
  clearActiveBaby();
}
```

**Why necessary:** Prevents UI from showing stale baby in navigation or selectors.

## User Notification

**Component:** `AccessRevokedModal.tsx`

**Props:**
```typescript
{
  babyName: string;
  reason: 'no_access' | 'baby_not_found';
  onClose: () => void;
}
```

**Display:**
- Modal overlay (cannot dismiss with backdrop click)
- Shows baby name and reason
- Single "OK" button redirects to bootstrap

**Reason messages:**
- `no_access`: "Your access to {babyName} has been removed."
- `baby_not_found`: "{babyName} is no longer available."

## Integration with AppShell

**Pattern:**
```typescript
// src/templates/AppShell.tsx
const { revokedBaby, handleClose } = useAccessRevocationDetection(locale);

return (
  <>
    {/* Main app content */}
    {revokedBaby && (
      <AccessRevokedModal
        babyName={revokedBaby.babyName}
        reason={revokedBaby.reason}
        onClose={handleClose}
      />
    )}
  </>
);
```

**Why in AppShell:** Hook runs globally, detects revocation anywhere in app (not just sharing page).

## Mutation Error Sources

**Entities that trigger detection:**

1. **Baby mutations:**
   - `entityType: 'baby'`
   - `entityId: babyId.toString()`

2. **Log mutations:**
   - `entityType: 'feed_log' | 'sleep_log' | 'nappy_log'`
   - `payload.babyId: number`

**Hook extracts baby IDs:**
```typescript
const babyIds = new Set<number>();

for (const mutation of failedMutations) {
  if (mutation.entityType === 'baby') {
    babyIds.add(Number(mutation.entityId));
  } else if (['feed_log', 'sleep_log', 'nappy_log'].includes(mutation.entityType)) {
    const payload = mutation.payload as { babyId?: number };
    if (payload.babyId) {
      babyIds.add(payload.babyId);
    }
  }
}
```

## Error Flow Example

**Scenario:** Owner revokes editor access while editor is offline.

1. Editor comes back online, attempts to edit baby name
2. Outbox processes mutation, server returns "Access denied"
3. Outbox stores mutation with `status: 'failed'`, `errorMessage: 'Access denied'`
4. `useLiveQuery` detects new failed mutation
5. Hook extracts baby ID, calls `verifyBabyAccess(babyId)`
6. Server confirms no access record exists
7. Hook calls `clearRevokedBabyData(babyId, userId)`
8. All local data for baby deleted (access, logs, outbox entries)
9. Stores updated (baby removed from lists)
10. Modal shown to user
11. User clicks OK, redirected to `/account/bootstrap`
12. Bootstrap shows "No baby yet" state

## Performance Considerations

**Optimization 1: Compound index query**
```typescript
// Fast
localDb.outbox.where('status').equals('failed')

// Slow (full table scan)
localDb.outbox.filter(m => m.status === 'failed')
```

**Optimization 2: Ref-based deduplication**
- Prevents checking same baby multiple times
- Important when multiple mutations fail simultaneously

**Optimization 3: Single transaction**
- Atomic cleanup prevents inconsistent state
- Faster than sequential deletions

## Gotchas

1. **Don't skip server verification:** Outbox "Access denied" could be temporary error, always verify with server.

2. **Multi-user cleanup:** Check `otherAccess` count before deleting baby/logs (handles device sharing).

3. **Mutation payload structure:** Log mutations store `babyId` in payload, baby mutations use `entityId` string.

4. **Bootstrap redirect required:** After cleanup, MUST redirect to bootstrap to resync account state (don't stay on current page).

5. **Global hook placement:** Must be in `AppShell` (not page-specific) to detect revocation anywhere in app.

## Related Files

**Hook:**
- `src/hooks/useAccessRevocationDetection.ts` - Main detection logic

**Helper:**
- `src/lib/local-db/helpers/access-revoked.ts` - Cleanup functions

**Component:**
- `src/components/AccessRevokedModal.tsx` - User notification
- `src/templates/AppShell.tsx` - Global integration

**Actions:**
- `src/actions/babyActions.ts` - `verifyBabyAccess` server action
