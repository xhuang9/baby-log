---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/
  - src/app/[locale]/(auth)/(app)/settings/
  - src/app/[locale]/(auth)/(app)/logs/
  - src/app/[locale]/(auth)/(app)/insights/
---

# Client-First Page Pattern

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Enable instant navigation and offline support by rendering key dashboard pages from IndexedDB instead of server data.

## Key Deviations from Standard

- **Server shell + client data**: Pages render minimal server shells and delegate all data loading to client components using Dexie.
- **Selective adoption**: Only pages with local-first data (overview, settings, baby management) follow this pattern; logs/insights are server-only placeholders.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/overview/page.tsx` - Server shell for overview.
- `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx` - Client data loading with `useLiveQuery`.
- `src/app/[locale]/(auth)/(app)/settings/page.tsx` - Server shell for settings.
- `src/app/[locale]/(auth)/(app)/settings/SettingsContent.tsx` - Client settings UI backed by IndexedDB.
- `src/app/[locale]/(auth)/(app)/logs/page.tsx` - Server-only placeholder (no IndexedDB data yet).
- `src/app/[locale]/(auth)/(app)/insights/page.tsx` - Server-only placeholder (no IndexedDB data yet).

### Data Flow
1. Server page resolves `locale` and renders a shell with `PageTitleSetter`.
2. Client content queries IndexedDB via `useLiveQuery`.
3. If no local data and online, redirect to `/account/bootstrap` for initial sync.
4. If offline and no data, render offline/setup messaging.

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

- **useLiveQuery states**: `undefined` means loading; handle separately from `null` (no data).
- **Non-client pages**: Logs/insights are currently server-only text; do not assume local-first data there yet.

## Testing Notes

- Clear IndexedDB and verify overview redirects when online.
- Force offline mode with empty IndexedDB and ensure offline error state renders.

## Related Systems

- `.readme/chunks/local-first.delta-sync-client.md` - Local-first data flow that populates IndexedDB.
- `.readme/chunks/account.bootstrap-unified-flow.md` - Initial bootstrap that seeds local data.
