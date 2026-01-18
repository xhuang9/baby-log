---
last_verified_at: 2026-01-17T09:09:26Z
source_paths:
  - src/app/[locale]/api/bootstrap/route.ts
  - src/app/[locale]/(auth)/account/bootstrap/page.tsx
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/types/bootstrap.ts
  - src/app/[locale]/(auth)/layout.tsx
---

# Bootstrap Unified Post-Login Flow

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose
Provide a single post-login entry point that resolves account state and hydrates local-first data in one round trip.

## Key Deviations from Standard

- **Single bootstrap endpoint**: `/api/bootstrap` returns account state + sync payload instead of multiple post-auth pages.
- **Client state machine**: `useBootstrapMachine` drives UI states and redirects instead of server-side routing logic.
- **Offline fallback**: Bootstrap checks IndexedDB and can render cached state when offline.

## Architecture / Implementation

### Components
- `src/app/[locale]/api/bootstrap/route.ts` - Upserts user, computes account state, returns recent sync payload.
- `src/app/[locale]/(auth)/account/bootstrap/page.tsx` - Renders state-specific UI and redirects.
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` - State machine + IndexedDB hydration + offline fallback.
- `src/types/bootstrap.ts` - Shared API/state types.
- `src/app/[locale]/(auth)/layout.tsx` - Clerk redirects to `/account/bootstrap` after sign-in/up.

### Data Flow
1. Clerk sign-in/up redirects to `/account/bootstrap` via auth layout fallback URLs.
2. `BootstrapPage` calls `useBootstrapMachine` and renders state components.
3. Hook fetches `/api/bootstrap` (locale-aware) when online.
4. API upserts `user`, resolves `accountState`, and returns recent logs + UI config.
5. Hook stores data in IndexedDB, hydrates Zustand stores, and dispatches `SYNC_SUCCESS`.
6. Page renders `locked | no_baby | pending_request | has_invites | select_baby | ready` and redirects on `ready`.

### Code Pattern
```ts
// useBootstrapMachine.ts
case 'SYNC_SUCCESS': {
  const { accountState } = action.response;
  switch (accountState.type) {
    case 'locked': return { status: 'locked' };
    case 'no_baby': return { status: 'no_baby' };
    case 'pending_request': return { status: 'pending_request', request: accountState.request };
    case 'has_invites': return { status: 'has_invites', invites: accountState.invites };
    case 'select_baby': return { status: 'select_baby', babies: accountState.babies };
    case 'ready': return { status: 'ready', activeBaby: accountState.activeBaby };
  }
}
```

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `signInFallbackRedirectUrl` | `/account/bootstrap` | Post-auth landing page configured in `AuthLayout`. |
| Recent log window | 7 days | `/api/bootstrap` returns last 7 days for feed/sleep/nappy logs. |
| `dynamic` | `force-dynamic` | Bootstrap API skips caching to always return fresh account state. |

## Gotchas / Constraints

- **Default baby repair**: API updates `user.defaultBabyId` if missing and bumps `lastAccessedAt`.
- **Offline bootstrap**: Requires prior cached data; otherwise shows sync error message.
- **UI config optional**: `syncData.uiConfig` can be `null` when user has no config row.

## Testing Notes

- Use `/account/bootstrap` with seeded data to verify state routing (no_baby/has_invites/select_baby).
- Toggle offline mode to confirm IndexedDB fallback and `offline_ok` state.

## Related Systems

- `.readme/chunks/local-first.ui-config-storage.md` - UI config persistence returned by bootstrap.
- `.readme/chunks/performance.instant-navigation.md` - Client-first rendering after bootstrap.
- `src/proxy.ts` - Middleware configuration protecting `/account/bootstrap` route with Clerk auth.
