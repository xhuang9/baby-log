---
last_verified_at: 2026-01-25T12:00:00Z
source_paths:
  - src/services/operations/feed-log.ts
  - src/services/operations/sleep-log.ts
  - src/app/[locale]/(auth)/(app)/logs/_components/edit-modals/EditFeedModal.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/edit-modals/EditSleepModal.tsx
---

# Feed & Sleep Log Edit/Delete Operations

## Purpose

Centralized operations layer for updating and deleting activity logs with local-first sync. Uses IndexedDB for immediate persistence, outbox for background sync, and confirms via toast notifications.

## Operations Layer Pattern

All edit/delete operations follow the standard local-first pattern:

### 6-Step Flow

1. **Validate input** - Check required fields and access control
2. **Check permissions** - Verify user can edit/delete this baby's logs
3. **Write to IndexedDB** - Persist change locally (immediate UI update)
4. **Enqueue to outbox** - Create mutation record for background sync
5. **Trigger background sync** - Call `flushOutbox()` (non-blocking)
6. **Return result** - Success/failure status with data

## Feed Log Operations

### `updateFeedLog(input: UpdateFeedLogInput): Promise<OperationResult<LocalFeedLog>>`

Updates an existing feed log with method-specific field handling.

#### Input Type

```typescript
type UpdateFeedLogInput = {
  id: string;
  method?: FeedMethod;              // 'bottle' or 'breast'
  startedAt?: Date;
  amountMl?: number | null;         // Bottle amount in ml
  isEstimated?: boolean;
  durationMinutes?: number | null;  // Breast duration
  endSide?: FeedSide | null;        // 'left', 'right', 'both'
  notes?: string | null;
};
```

All fields optional (only changed fields required).

#### Implementation Details

**Access Control**:
```typescript
// Verify user can edit this baby's logs
const access = await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([user.localId, existing.babyId])
  .first();

if (!access ||
    (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
  return failure('Access denied to this baby');
}
```

**Method-Specific Field Merging**:
```typescript
// Preserve existing values, only update provided fields
const method = input.method ?? existing.method;
const startedAt = input.startedAt ?? existing.startedAt;
const durationMinutes = input.durationMinutes !== undefined
  ? input.durationMinutes
  : existing.durationMinutes;

// Calculate endedAt based on duration (breast feeds only)
let endedAt: Date | null = null;
if (method === 'breast' && durationMinutes) {
  endedAt = new Date(
    startedAt.getTime() + durationMinutes * 60 * 1000
  );
}
```

**Key Rules**:
- For **bottle** feeds: `amountMl` is set, `durationMinutes`/`endSide` cleared
- For **breast** feeds: `durationMinutes`/`endSide` are set, `amountMl` cleared
- `endedAt` computed from `startedAt + durationMinutes` (breast only)
- If method changes: old method's fields are cleared

**Outbox Payload**:
```typescript
await addToOutbox({
  mutationId: generateMutationId(),
  entityType: 'feed_log',
  entityId: input.id,
  op: 'update',
  payload: {
    // Full updated state with ISO timestamps
    id, babyId, loggedByUserId, method, startedAt, endedAt,
    durationMinutes, amountMl, isEstimated, endSide, notes,
    createdAt, updatedAt
  },
});
```

### `deleteFeedLog(id: string): Promise<OperationResult<void>>`

Soft-deletes a feed log (removes from IndexedDB, enqueues delete mutation).

#### Implementation

```typescript
// 1. Load existing log (for access check)
const existing = await localDb.feedLogs.get(id);
if (!existing) return failure('Feed log not found');

// 2. Check access
const user = useUserStore.getState().user;
const access = await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([user.localId, existing.babyId])
  .first();

if (!access || access.accessLevel not in ['owner', 'editor']) {
  return failure('Access denied to this baby');
}

// 3. Delete from IndexedDB
await localDb.feedLogs.delete(id);

// 4. Enqueue delete mutation
await addToOutbox({
  mutationId: generateMutationId(),
  entityType: 'feed_log',
  entityId: id,
  op: 'delete',
  payload: null,  // No payload for deletes
});

// 5. Background sync
void flushOutbox();
```

## Sleep Log Operations

### `updateSleepLog(input: UpdateSleepLogInput): Promise<OperationResult<LocalSleepLog>>`

Same pattern as `updateFeedLog` but for sleep logs.

#### Input Type

```typescript
type UpdateSleepLogInput = {
  id: string;
  startedAt?: Date;
  endedAt?: Date;
  durationMinutes?: number | null;
  quality?: SleepQuality | null;  // 'good', 'ok', 'poor'
  notes?: string | null;
};
```

#### Duration Calculation

```typescript
// Compute durationMinutes from start/end times if both provided
if (startedAt && endedAt) {
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
}
```

### `deleteSleepLog(id: string): Promise<OperationResult<void>>`

Same deletion pattern as `deleteFeedLog`.

## Edit Modal Integration Pattern

### Modal Component Structure

Each modal (`EditFeedModal`, `EditSleepModal`) handles:

1. **Form state**: Reuses `useFeedFormState` or `useSleepFormState` hooks
2. **Initialization**: Pre-fills form with current log data on mount
3. **Edit submission**: Calls `updateFeedLog()` or `updateSleepLog()`
4. **Delete submission**: Two-stage with AlertDialog confirmation
5. **Error handling**: Shows toast and error state in modal

### Form Initialization (Feed Example)

```typescript
useEffect(() => {
  if (open) {
    // Populate form with current log values
    actions.setMethod(feed.method);
    actions.setStartTime(feed.startedAt);
    actions.setAmountMl(feed.amountMl ?? 120);

    if (feed.method === 'breast') {
      if (feed.durationMinutes) {
        const endTime = new Date(
          feed.startedAt.getTime() + feed.durationMinutes * 60 * 1000
        );
        actions.setEndTime(endTime);
      }
      if (feed.endSide) {
        actions.setEndSide(feed.endSide);
      }
    }
  }
}, [open, feed, actions]);
```

### Update Submission

```typescript
const handleUpdate = async () => {
  setError(null);
  setIsSubmitting(true);

  try {
    // Call operation
    const result = await updateFeedLog({
      id: log.id,
      method: state.method,
      startedAt: state.startTime,
      amountMl: state.method === 'bottle' ? state.amountMl : null,
      durationMinutes: state.method === 'breast'
        ? Math.round(
            (state.endTime.getTime() - state.startTime.getTime()) /
            (1000 * 60)
          )
        : null,
      endSide: state.method === 'breast' ? state.endSide : null,
    });

    if (!result.success) {
      setError(result.error);
      notifyToast.error(result.error);
      return;
    }

    notifyToast.success('Feed updated');
    onOpenChange(false);  // Auto-close modal
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update feed';
    setError(message);
    notifyToast.error(message);
  } finally {
    setIsSubmitting(false);
  }
};
```

### Delete Submission (Two-Stage)

**Stage 1**: User clicks delete button
```typescript
<button onClick={() => setShowDeleteConfirm(true)}>
  Delete
</button>
```

**Stage 2**: Confirmation dialog
```typescript
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogTitle>Delete feed log?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone. This will permanently delete this feed log.
    </AlertDialogDescription>
    <AlertDialogAction
      variant="destructive"
      onClick={handleDelete}
    >
      Delete
    </AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

**Stage 3**: Confirmed delete
```typescript
const handleDelete = async () => {
  setIsSubmitting(true);

  try {
    const result = await deleteFeedLog(log.id);

    if (!result.success) {
      setError(result.error);
      notifyToast.error(result.error);
      return;
    }

    notifyToast.success('Feed deleted');
    setShowDeleteConfirm(false);
    onOpenChange(false);  // Auto-close modal
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete feed';
    setError(message);
    notifyToast.error(message);
  } finally {
    setIsSubmitting(false);
  }
};
```

## UI Auto-Update Pattern

After operation succeeds, UI updates automatically via `useLiveQuery`:

1. Operation calls `updateFeedLog()` or `deleteFeedLog()`
2. Operation writes to IndexedDB
3. `useLiveQuery` in `useAllActivityLogs` detects change
4. Hook re-queries feed/sleep logs from IndexedDB
5. Component re-renders with new data
6. Logs list updates immediately (no manual refresh needed)

Example flow:
```
User clicks Update
  → updateFeedLog() called
    → saveFeedLogs() writes to IndexedDB
      → useLiveQuery detects change
        → useAllActivityLogs re-queries
          → LogsList receives new logs array
            → LogItem with updated data renders
```

## Error Handling

All operations return `OperationResult<T>` type:

```typescript
type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

Modal handles errors with:

1. **Display in modal**: `error` state shown below form
2. **Toast notification**: Immediate user feedback
3. **Preserve form state**: User can retry without re-entering
4. **Retry support**: User can modify and re-submit

Common error cases:
- "Feed log not found" - Already deleted by another user
- "Access denied to this baby" - Lost caregiver access
- "Failed to update feed log" - IndexedDB write failed
- "Client-only operation" - Called from server context (dev error)

## Offline Behavior

While offline:

1. Operation succeeds locally (IndexedDB write completes)
2. Modal closes, success toast shown
3. Outbox mutation queued (not sent to server yet)
4. `flushOutbox()` called but will retry on reconnect
5. User sees updated log immediately
6. Mutation syncs to server when online

While online + unconfirmed:

1. Outbox mutation pending sync
2. If server confirms: mutation removed from outbox
3. If server rejects (e.g., access revoked): operation reverted

## Related Documentation

- `.readme/chunks/local-first.operations-layer-pattern.md` - Standard 6-step operations pattern
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox table for offline mutations
- `.readme/chunks/feed-logging.server-actions.md` - Server-side mutation handling
- `.readme/sections/feed-logging.index.md` - Feed logging system overview
