---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx
---

# Flattened Baby Management UI Pattern

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Show all babies and switching actions in a single client-first page to reduce navigation depth for mobile users.

## Key Deviations from Standard

- **Client-first list**: The list is rendered entirely from IndexedDB via `useLiveQuery` rather than server data.
- **Flattened flow**: The main `/settings/babies` page combines list + switch actions; the `[babyId]` route is edit-only.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/settings/babies/page.tsx` - Server shell and page title.
- `src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx` - Client list, switch actions, add button.
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx` - Edit route shell for a specific baby.

### Data Flow
1. `BabiesManagement` reads `localDb.babyAccess` and `localDb.babies` to build the list.
2. Current default baby is derived from `userData.defaultBabyId`.
3. `setDefaultBaby` server action updates the default and `useBabyStore` syncs the active baby.
4. `router.refresh()` re-renders the page to show updated default styling.

### Code Pattern
```tsx
const result = await setDefaultBaby(babyId);
if (result.success) {
  setActiveBaby(result.baby);
  router.refresh();
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `user.defaultBabyId` | `null` | Determines the highlighted default baby section.
| `accessLevel` | `viewer` | Used for display ordering and access labeling.
| `switchingTo` | `null` | Disables switch buttons while a change is pending.

## Gotchas / Constraints

- **IndexedDB availability**: If local data is missing, the list shows skeletons until Dexie resolves.
- **Refresh required**: `router.refresh()` is necessary to reflect server-side default changes in UI.

## Testing Notes

- Seed IndexedDB with multiple babies and verify default highlighting.
- Switch babies and confirm `useBabyStore` updates and UI refreshes.

## Related Systems

- `.readme/chunks/baby-management.edit-functionality.md` - Edit form flow.
- `.readme/chunks/local-first.delta-sync-client.md` - Local data population.
