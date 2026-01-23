---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/services/operations/baby.ts
  - src/stores/useBabyStore.ts
  - src/stores/useUserStore.ts
---

# IndexedDB + Zustand State Consistency

## Purpose

Documents the critical pattern of keeping IndexedDB and Zustand stores in sync during client-side operations. When user actions modify both persistent (IndexedDB) and UI (Zustand) state, they must be updated atomically to prevent state drift.

## The Problem

In local-first architecture, the UI reads from Zustand stores for instant reactivity, while IndexedDB serves as the durable client-side cache. If these fall out of sync:

1. **UI shows stale data** - User switches baby, but Overview still shows old baby's logs
2. **Page refresh resets changes** - IndexedDB hydration overwrites Zustand with old data
3. **Inconsistent multi-tab experience** - Tabs see different state

### Example: Baby Switching Bug (Fixed)

**Before (Broken):**
```typescript
export async function setDefaultBaby(babyId: number) {
  // Only updated Zustand store
  useBabyStore.getState().setActiveBaby(activeBaby);
  // IndexedDB user.defaultBabyId NOT updated!
}
```

**Problem:** When user switched babies via BabySwitcher:
- Zustand `activeBaby` updated → UI showed new baby selected
- But `user.defaultBabyId` in IndexedDB still pointed to old baby
- Overview component read from IndexedDB → showed wrong baby's data
- Page refresh would rehydrate from IndexedDB → revert to old baby

## The Pattern: Atomic Dual Updates

Always update IndexedDB and Zustand together in a transaction:

```typescript
export async function setDefaultBaby(
  babyId: number,
): Promise<OperationResult<void>> {
  // ... validation and access checks ...

  const now = new Date();

  // Transaction to update BOTH user.defaultBabyId AND babyAccess
  await localDb.transaction('rw', [localDb.users, localDb.babyAccess], async () => {
    // 1. Update user's defaultBabyId in IndexedDB
    await localDb.users.update(user.localId, {
      defaultBabyId: babyId,
      updatedAt: now,
    });

    // 2. Update lastAccessedAt on babyAccess
    const updatedAccess: LocalBabyAccess = {
      ...access,
      lastAccessedAt: now,
      updatedAt: now,
    };
    await saveBabyAccess([updatedAccess]);
  });

  // 3. Update active baby in Zustand store
  const activeBaby: ActiveBaby = {
    babyId: baby.id,
    name: baby.name,
    accessLevel: access.accessLevel,
    caregiverLabel: access.caregiverLabel,
  };

  useBabyStore.getState().setActiveBaby(activeBaby);

  return success(undefined);
}
```

## Key Implementation Rules

### 1. IndexedDB First, Then Zustand

Order matters for crash safety:

```typescript
// Correct order
await localDb.users.update(user.localId, { defaultBabyId: babyId });
useBabyStore.getState().setActiveBaby(activeBaby);

// Why: If crash occurs after IndexedDB write but before Zustand update,
// next hydration will correctly load from IndexedDB.
// If Zustand updates first but IndexedDB fails, we have inconsistent state.
```

### 2. Use Dexie Transactions for Multiple IndexedDB Writes

When updating multiple tables, use a transaction:

```typescript
await localDb.transaction('rw', [localDb.users, localDb.babyAccess], async () => {
  await localDb.users.update(user.localId, { defaultBabyId: babyId });
  await saveBabyAccess([updatedAccess]);
});
```

This ensures atomic updates - either both succeed or both fail.

### 3. Zustand Updates Are Fire-and-Forget

Zustand updates are synchronous and memory-only, so they don't need error handling:

```typescript
// Zustand update (sync, can't fail)
useBabyStore.getState().setActiveBaby(activeBaby);
```

### 4. Same Data Shape in Both Stores

Keep the data structures aligned to prevent transformation bugs:

```typescript
// IndexedDB (LocalBaby)
const baby: LocalBaby = {
  id: 123,
  name: 'Emma',
  // ...
};

// Zustand (ActiveBaby - derived view)
const activeBaby: ActiveBaby = {
  babyId: baby.id,      // Maps to id
  name: baby.name,      // Same
  accessLevel: access.accessLevel,  // From babyAccess
  caregiverLabel: access.caregiverLabel,
};
```

## When to Apply This Pattern

Use atomic dual updates whenever:

1. **User preferences change** - `defaultBabyId`, UI settings
2. **Entity selection changes** - Active baby, selected log
3. **Create operations** - New entity in IndexedDB + store list update
4. **Delete operations** - Remove from IndexedDB + store list cleanup

### Operations That Already Follow This Pattern

- `createBaby()` - Writes baby + access to IndexedDB, updates `allBabies` and `activeBaby` in store
- `updateBabyProfile()` - Updates IndexedDB baby record, syncs `activeBaby` name if active
- `setDefaultBaby()` - Updates IndexedDB `user.defaultBabyId`, sets `activeBaby` in store
- `deleteBaby()` - Soft-deletes in IndexedDB, removes from `allBabies`, clears if active

## Anti-Patterns to Avoid

### Don't Update Zustand Without IndexedDB

```typescript
// BAD: Zustand-only update
function setActiveBaby(baby: ActiveBaby) {
  useBabyStore.getState().setActiveBaby(baby);
  // Missing IndexedDB update!
}

// GOOD: Use operation that updates both
async function setDefaultBaby(babyId: number) {
  await localDb.users.update(...);  // IndexedDB
  useBabyStore.getState().setActiveBaby(...);  // Zustand
}
```

### Don't Read From Different Sources

```typescript
// BAD: UI reads from IndexedDB directly while store is stale
const user = await localDb.users.get(userId);
const activeBaby = user.defaultBabyId; // IndexedDB

// Meanwhile, Zustand has different value
const storeActiveBaby = useBabyStore.getState().activeBaby;

// GOOD: Single source for UI reads (Zustand), backed by IndexedDB
const activeBaby = useBabyStore((s) => s.activeBaby);
```

## Debugging State Drift

If you suspect IndexedDB/Zustand drift:

1. **Check IndexedDB** - DevTools → Application → IndexedDB → baby-log
2. **Check Zustand** - `useBabyStore.getState()` in console
3. **Compare values** - Especially `defaultBabyId` vs `activeBaby.babyId`
4. **Refresh page** - If drift exists, hydration will reset to IndexedDB values

## Related

- `.readme/chunks/local-first.store-hydration-pattern.md` - How stores hydrate from IndexedDB on load
- `.readme/chunks/local-first.operations-layer-pattern.md` - Standard operation flow that includes store updates
- `.readme/sections/baby-management.index.md` - Baby switching UI
