---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx
  - src/actions/babyActions.ts
  - src/services/baby-access.ts
---

# Baby Edit Functionality

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Allow owners and editors to update baby profile data and their own caregiver label via a collapsible form UI.

## Key Deviations from Standard

- **Client-side access gate**: `EditBabyContent` reads IndexedDB and redirects viewers before the form renders.
- **Service-based server check**: `updateBaby` uses `assertUserCanEditBaby` to enforce access on the server.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx` - Server shell and breadcrumbs.
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyContent.tsx` - Client data load + access checks.
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx` - Form UI and submission handling.
- `src/actions/babyActions.ts` - `updateBaby` server action.
- `src/services/baby-access.ts` - Access validation helpers.

### Data Flow
1. `EditBabyContent` loads `baby` + `babyAccess` from IndexedDB and redirects viewers.
2. `EditBabyForm` submits to `updateBaby` with partial update payload.
3. `updateBaby` validates permissions and updates `babies` + `baby_access` as needed.
4. Revalidations run and the client redirects back to settings.

### Code Pattern
```tsx
const result = await updateBaby(babyId, {
  name: name.trim(),
  birthDate: birthDate ? new Date(birthDate) : null,
  gender: gender === 'unknown' ? null : gender,
  birthWeightG: birthWeightG ? Number.parseInt(birthWeightG, 10) : null,
  caregiverLabel: caregiverLabel.trim() || 'Parent',
});
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `caregiverLabel` | `Parent` | Default label if the user leaves the input empty.
| `gender` | `unknown` | Select default that maps to `null` on submit.
| `birthDate.max` | `today` | Prevents selecting a future date in the date input.

## Gotchas / Constraints

- **IndexedDB dependency**: Client access checks rely on local data; missing data redirects to `/settings`.
- **Partial updates**: `updateBaby` only updates provided fields, so omit keys intentionally.

## Testing Notes

- Seed IndexedDB with baby/access rows and verify viewer redirect.
- Submit form with only name changes and confirm other fields stay unchanged.

## Related Systems

- `.readme/chunks/baby-management.flattened-ui-pattern.md` - Baby management list layout.
- `.readme/chunks/account.state-sync-pattern.md` - Store hydration used across settings flows.
