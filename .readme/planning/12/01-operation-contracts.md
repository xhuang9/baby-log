# Operations Layer Contracts

## Runtime Boundaries

- Operations are **client-only**. Guard with `typeof window !== 'undefined'` if
  importing Dexie helpers directly.
- Do not import server-only modules (Clerk server, Drizzle, Next cache).
- Server actions remain available but should only be called from operations
  (not directly from UI).

---

## Standard Result Type

Use a consistent union shape for all operations:

```ts
export type OperationResult<T>
  = | { success: true; data: T }
    | { success: false; error: string };
```

Operations should avoid throwing; return a failure result instead.

---

## Required Steps for Every Operation

1. **Validate input** (trim, parse, required checks).
2. **Read local context** (user, active baby) from Zustand if needed.
3. **Write IndexedDB** using helpers in `src/lib/local-db/helpers`.
4. **Update Zustand** for immediate UI state alignment.
5. **Enqueue outbox** mutation for server sync.
6. **Trigger sync non-blocking** (optional) via `void flushOutbox()`.

If any step fails after IndexedDB write, still return success and leave the
outbox entry for later retry. Local-first UI must not roll back.

---

## Outbox Usage Rules

- Use `OutboxEntityType` and `OutboxOperation` from `src/lib/local-db/types/outbox.ts`.
- `mutationId` should be a UUID (`crypto.randomUUID()` in browsers).
- `entityId` should be a string version of the numeric ID for server entities.
- Payload should contain the **full row** or a complete patch expected by
  `/api/sync/push`.

**Note:** Outbox already includes `baby` in its types, but the push API and
sync service do not yet process it. That is part of this refactor.

---

## Example: Update Baby Profile (Pseudo)

```ts
import { addToOutbox, localDb } from '@/lib/local-db';
import { flushOutbox } from '@/services/sync-service';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

export async function updateBabyProfile(input): Promise<OperationResult<ActiveBaby>> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Client-only operation' };
  }

  const user = useUserStore.getState().user;
  if (!user?.localId) {
    return { success: false, error: 'Missing user context' };
  }

  const payload = { ...input, updatedAt: new Date() };

  await localDb.transaction('rw', [localDb.babies, localDb.babyAccess, localDb.outbox], async () => {
    await localDb.babies.update(input.babyId, payload);
    await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, input.babyId])
      .modify({ caregiverLabel: input.caregiverLabel });
    await addToOutbox({
      mutationId: crypto.randomUUID(),
      entityType: 'baby',
      entityId: String(input.babyId),
      op: 'update',
      payload,
    });
  });

  // Keep Zustand in sync (use existing setters)
  const babyStore = useBabyStore.getState();
  // Update activeBaby and allBabies via setActiveBaby / setAllBabies

  // Non-blocking sync
  void flushOutbox();

  return { success: true, data: /* ActiveBaby */ };
}
```

---

## Server Sync Support (Required)

To support `baby` in outbox-based updates:

- `src/app/[locale]/api/sync/push/route.ts`: accept entityType `baby`.
- `src/services/sync-service.ts`: handle `baby` in `applyChange` and
  `applyServerData`.
- `src/app/[locale]/api/sync/pull/route.ts`: no change needed beyond
  `sync_events` emitting `baby` updates.

---

## Testing Guidance

- Unit test operation functions by mocking `@/lib/local-db` helpers and
  `flushOutbox`.
- Verify outbox entries are created with expected payloads.
- Confirm Zustand updates match the IndexedDB changes.
