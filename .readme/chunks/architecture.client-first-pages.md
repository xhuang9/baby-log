---
last_verified_at: 2026-01-18T12:33:25Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/
  - src/app/[locale]/(auth)/(app)/settings/
  - src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx
  - src/app/[locale]/(auth)/(app)/logs/
  - src/app/[locale]/(auth)/(app)/insights/
  - src/proxy.ts
conversation_context: "Updated settings client-first page references after moving SettingsContent into _components."
---

# Client-First Page Pattern

> Status: active
> Last updated: 2026-01-18
> Owner: Core

## Purpose

Enable instant navigation and cached data display by rendering key dashboard pages from IndexedDB instead of server data.

## Key Deviations from Standard

- **Authentication required**: All app routes require Clerk middleware (defined in `src/proxy.ts`). No offline auth bypass.
- **Server shell + client data**: Pages render minimal server shells with `auth()` checks, then delegate data loading to client components using Dexie.
- **Local-first with auth**: IndexedDB provides fast cached data, but initial page load requires valid authentication.
- **Selective adoption**: Only pages with local-first data (overview, settings, baby management) follow this pattern; logs/insights are server-only placeholders.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/overview/page.tsx` - Server shell for overview.
- `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx` - Client data loading with `useLiveQuery`.
- `src/app/[locale]/(auth)/(app)/settings/page.tsx` - Server shell for settings.
- `src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx` - Client settings UI backed by IndexedDB.
- `src/app/[locale]/(auth)/(app)/logs/page.tsx` - Server-only placeholder (no IndexedDB data yet).
- `src/app/[locale]/(auth)/(app)/insights/page.tsx` - Server-only placeholder (no IndexedDB data yet).

### Data Flow
1. Request hits Clerk middleware in `src/proxy.ts` - authentication required for all app routes.
2. Server page component runs `auth()` to verify session (server actions need this).
3. Server page resolves `locale` and renders a shell with `PageTitleSetter`.
4. Client content queries IndexedDB via `useLiveQuery`.
5. If no local data and online, redirect to `/account/bootstrap` for initial sync.
6. If offline and no data, render offline/setup messaging.

### Code Pattern
```tsx
const userData = useLiveQuery(async () => {
  const user = await localDb.users.toCollection().first();
  return user ?? null;
}, []);

if (userData === undefined) {
  return <OverviewSkeleton />;
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `locale` | `en` | Route param used to build redirect paths and localized links.
| `bootstrapRedirectPath` | `/${locale}/account/bootstrap` | Redirect target when local data is missing and the user is online.

## Gotchas / Constraints

- **Authentication required**: Pages will not load offline without service worker caching. Clerk middleware blocks unauthenticated requests.
- **useLiveQuery states**: `undefined` means loading; handle separately from `null` (no data).
- **Non-client pages**: Logs/insights are currently server-only text; do not assume local-first data there yet.
- **Server actions**: All pages may use server actions that call `auth()`, requiring valid Clerk session.

## Testing Notes

- Clear IndexedDB and verify overview redirects when online.
- Force offline mode with empty IndexedDB and ensure offline error state renders.

## Related Systems

- `src/proxy.ts` - Middleware configuration showing all protected routes
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk authentication integration
- `.readme/chunks/local-first.delta-sync-client.md` - Local-first data flow that populates IndexedDB
- `.readme/chunks/account.bootstrap-unified-flow.md` - Initial bootstrap that seeds local data
