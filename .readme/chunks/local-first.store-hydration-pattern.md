---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/components/SyncProvider.tsx
  - src/stores/useUserStore.ts
  - src/stores/useBabyStore.ts
  - src/templates/AppShell.tsx
---

# Store Hydration Pattern (Local-First)

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Hydrate Zustand stores from IndexedDB to make the app usable offline, with an optional background sync path.

## Key Deviations from Standard

- **IndexedDB-first hydration**: Stores prefer `hydrateFromIndexedDB()` and only fall back to sessionStorage.
- **Background sync is TODO**: `SyncProvider` includes a placeholder `backgroundSync` call but no implementation.

## Architecture / Implementation

### Components
- `src/components/SyncProvider.tsx` - Orchestrates hydration and initial sync.
- `src/stores/useUserStore.ts` - User store with sessionStorage + IndexedDB hydration.
- `src/stores/useBabyStore.ts` - Baby store with active/all babies hydration.
- `src/templates/AppShell.tsx` - Wraps the app with `SyncProvider` and auth session sync.

### Data Flow
1. `SyncProvider` waits for Clerk auth and runs `hydrateFromIndexedDB()`.
2. If a local user exists, it hydrates baby store and renders immediately.
3. If no local data and online, it calls `performInitialSyncAndHydrate`.
4. If offline with no local data, it renders an error state with retry.

### Code Pattern
```ts
await userStore.getState().hydrateFromIndexedDB();
const user = userStore.getState().user;
if (user) {
  await babyStore.getState().hydrateFromIndexedDB(user.localId);
  setState({ isReady: true, isLoading: false, error: null });
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SyncState.isLoading` | `true` | Blocks UI until hydration completes.
| `SyncState.isReady` | `false` | Set true once stores are hydrated.
| `SyncState.error` | `null` | Error message for offline/no-data cases.

## Gotchas / Constraints

- **Auth dependency**: `SyncProvider` waits for `useAuth()` to resolve before hydrating.
- **Background sync missing**: The `backgroundSync` function is currently a TODO.

## Testing Notes

- Clear IndexedDB and go offline to confirm the error state renders.
- Seed IndexedDB and verify the app renders immediately without server calls.

## Related Systems

- `.readme/chunks/local-first.initial-sync-service.md` - Initial sync implementation.
- `.readme/chunks/account.state-sync-pattern.md` - Store hydration mechanics.
