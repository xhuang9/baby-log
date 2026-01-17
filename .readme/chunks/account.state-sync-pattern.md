---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/stores/useUserStore.ts
  - src/stores/useBabyStore.ts
  - src/components/auth/SignOutButton.tsx
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
---

# User/Baby State Sync Pattern

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Keep user and baby context available across refreshes and offline sessions with a dual persistence strategy (sessionStorage + IndexedDB).

## Key Deviations from Standard

- **Dual persistence**: Zustand stores hydrate quickly from sessionStorage, then fall back to IndexedDB for offline durability.
- **Explicit hydration flow**: Stores expose `hydrate` and `hydrateFromIndexedDB` rather than relying on implicit persistence middleware.

## Architecture / Implementation

### Components
- `src/stores/useUserStore.ts` - User state, sessionStorage mirror, IndexedDB hydration.
- `src/stores/useBabyStore.ts` - Active baby + all babies list, dual persistence.
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` - Writes bootstrap data and hydrates stores offline.
- `src/components/auth/SignOutButton.tsx` - Clears stores, sessionStorage, and offline auth session.

### Data Flow
1. Bootstrap fetch stores server data in IndexedDB and updates Zustand stores.
2. When offline, `useBootstrapMachine` calls `hydrateFromIndexedDB` to rebuild stores.
3. Stores mirror to sessionStorage for fast rehydration on refresh.
4. Sign-out clears Zustand, sessionStorage keys, and the offline auth marker.

### Code Pattern
```ts
const userStore = useUserStore.getState();
await userStore.hydrateFromIndexedDB();
const user = useUserStore.getState().user;
if (user) {
  const babyStore = useBabyStore.getState();
  await babyStore.hydrateFromIndexedDB(user.localId);
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `sessionStorage: baby-log:user` | `null` | Serialized `StoredUser` for quick hydration.
| `sessionStorage: baby-log:active-baby` | `null` | Active baby snapshot used on refresh.
| `sessionStorage: baby-log:all-babies` | `[]` | Cached list of accessible babies.

## Gotchas / Constraints

- **IndexedDB dependency**: `hydrateFromIndexedDB` runs only in the browser and uses dynamic imports to avoid SSR crashes.
- **Hydration ordering**: `hydrateFromIndexedDB` for babies requires a user localId; call after user hydration.

## Testing Notes

- Simulate offline bootstrap to ensure `hydrateFromIndexedDB` populates both stores.
- Verify sign-out clears sessionStorage keys and `clearAuthSession`.

## Related Systems

- `.readme/chunks/local-first.offline-auth-bypass.md` - Offline auth session marker used on sign-out.
- `.readme/chunks/account.bootstrap-unified-flow.md` - Bootstrap flow that populates stores.
