---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/SettingsContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/HandPreferenceSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/ThemeSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/BabiesList.tsx
---

# Settings Page UI

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Provide a client-side settings hub that reads/writes local-first preferences and baby metadata without server fetches.

## Key Deviations from Standard

- **Client-only data**: The page shell is server-rendered but all data comes from IndexedDB via `useLiveQuery`, not server actions.
- **Local-first preferences**: Theme/hand/time-swiper settings write directly to `uiConfig` in IndexedDB with toasts, no remote API.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/settings/page.tsx` - Server shell that sets metadata and passes locale.
- `src/app/[locale]/(auth)/(app)/settings/SettingsContent.tsx` - Client layout, sections, Dexie queries.
- `src/app/[locale]/(auth)/(app)/settings/BabiesList.tsx` - Child list + add child link.
- `src/app/[locale]/(auth)/(app)/settings/ThemeSetting.tsx` - Theme selector and DOM class toggle.
- `src/app/[locale]/(auth)/(app)/settings/HandPreferenceSetting.tsx` - Handedness selector stored in IndexedDB.

### Data Flow
1. `SettingsPage` resolves `locale` and renders `SettingsContent`.
2. `SettingsContent` uses `useLiveQuery` to read `localDb.babyAccess` + `localDb.babies`, filters archived, sorts by access level.
3. Section components read `uiConfig` via `getUIConfig`, then persist changes with `updateUIConfig` and toast feedback.

### Code Pattern
```tsx
const babies = useLiveQuery(async () => {
  const accessList = await localDb.babyAccess.toArray();
  const babyIds = accessList.map(a => a.babyId);
  const allBabies = await localDb.babies.where('id').anyOf(babyIds).toArray();
  return allBabies.filter(b => b.archivedAt === null);
}, []);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `uiConfig.theme` | `system` | Theme mode applied via `document.documentElement.classList`.
| `uiConfig.handMode` | `right` | Dominant hand for layout adjustments.
| `uiConfig.timeSwiper` | `{ use24Hour: false, swipeSpeed: 0.5, incrementMinutes: 30, magneticFeel: false, showCurrentTime: true }` | Controls time swiper UI behavior.

## Gotchas / Constraints

- **Loading state**: `SettingsContent` returns skeletons while `useLiveQuery` resolves; ensure tests seed IndexedDB.
- **Theme application**: Theme changes toggle the `dark` class directly on `document.documentElement`.

## Testing Notes

- Seed `localDb.babies` and `localDb.babyAccess` to validate ordering and rendering.
- Verify `updateUIConfig` writes and toasts for theme/hand/time-swiper settings.

## Related Systems

- `.readme/chunks/local-first.ui-config-storage.md` - Persistence format for UI settings.
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk-provided user context used for account row.
