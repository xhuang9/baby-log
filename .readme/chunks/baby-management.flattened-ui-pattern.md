---
last_verified_at: 2026-01-08T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx
---

# Flattened Baby Management UI Pattern

## Purpose
The baby management interface uses a **flattened, single-page pattern** instead of traditional hierarchical navigation. All babies are displayed in one view with inline actions, optimizing for mobile-first PWA usage.

## Key Deviations from Standard

### Single-Page View Instead of List-Detail Pattern
**Standard approach:**
- `/settings/babies` → list view
- `/settings/babies/[id]` → detail view with separate page

**This implementation:**
- `/settings/babies` → **combined list + actions** on one page
- `/settings/babies/[id]` → **edit form only** (not a detail view)
- No intermediate detail/overview pages

**Why:** Reduces navigation depth for mobile users, faster baby switching without page transitions.

### Inline Switch Actions
Baby switching happens **in-place** without navigation:
- Click "Switch" button → server action executes → page refreshes
- No redirect to separate confirmation page
- Optimistic UI: Button shows "Switching..." during operation

### Visual Hierarchy
Uses **visual prominence** instead of navigation hierarchy:
- **Current default baby:** Highlighted with primary border + background
- **Other babies:** Standard card styling
- **Add new baby:** Dashed border link (visually distinct)

## Implementation

### Route Structure
```
/settings/babies
  └── page.tsx               # Server component, loads data
      └── BabiesManagement.tsx   # Client component, handles UI

/settings/babies/[babyId]
  └── page.tsx               # Server component, loads baby data
      └── EditBabyForm.tsx       # Client component, edit form
```

### BabiesManagement Component Pattern

**Server component responsibilities:**
- Fetch all babies via join: `baby_access` → `babies`
- Filter out archived babies (`archivedAt IS NULL`)
- Pass data as props to client component

**Client component responsibilities:**
- Render current default baby (highlighted section)
- Render other babies (switch buttons)
- Handle `setDefaultBaby()` server action
- Update Zustand store (`useBabyStore`) on switch
- Display inline error messages

### Key Features

#### 1. Age Formatting Utility
Located in `BabiesManagement.tsx` (colocated with component):
```typescript
formatAge(birthDate: Date | null): string | null
```

**Logic:**
- Less than 1 month: "Less than 1 month"
- 1-11 months: "N months old"
- 1+ years: "Ny Nm old" format

**Why colocated:** Component-specific logic, not reusable elsewhere yet.

#### 2. Inline Switch Action
```typescript
const handleSwitchBaby = async (babyId: number) => {
  setSwitchingTo(babyId); // Optimistic UI
  const result = await setDefaultBaby(babyId);
  setActiveBaby(result.baby); // Update Zustand store
  router.refresh(); // Refresh page data
};
```

**Key pattern:**
- No navigation → user stays on same page
- Store updated immediately for global state sync
- `router.refresh()` updates server component data

#### 3. Error Handling
- Errors displayed **above the list** (global error state)
- Per-operation error messages (not per-baby)
- No toast notifications (keeping UI simple)

## Access Control

### Edit Access
Only **owners** and **editors** can access `/settings/babies/[babyId]`:
```typescript
if (babyData.accessLevel === 'viewer') {
  redirect('/settings'); // Viewers cannot edit
}
```

**Enforced in:**
- Server component: Route-level check before rendering form
- Server action: `updateBaby()` validates access level

### Switch Access
All users with **any access level** can switch default baby:
- Owners, editors, and viewers can all set a different baby as default
- Access level only affects **editing**, not **selection**

## Patterns

### No Separate "View Details" Page
- `/settings/babies/[babyId]` is **edit mode only**
- To view baby details → check dashboard or settings overview
- This reduces navigation complexity

### Direct Edit Links
**Not implemented yet, but planned pattern:**
- Add "Edit" button next to baby name in `BabiesManagement`
- Links to `/settings/babies/[babyId]`
- Currently users must navigate via settings menu

### Add Baby Button
- Positioned **at bottom** of list (after all babies)
- Dashed border styling (indicates "add new" action)
- Icon: `Plus` (lucide-react)
- No separate "Create" page distinction from "Add Another"

## Gotchas

### Router.refresh() After Switch
**Critical:** Must call `router.refresh()` after switching babies:
```typescript
setActiveBaby(result.baby); // Client-side store
router.refresh();           // Server-side data refresh
```

**Why:** The `page.tsx` server component queries `user.defaultBabyId` from database. Without refresh, the highlighted "Current Default Baby" section wouldn't update.

### Baby Store Update Timing
Update Zustand store **before** `router.refresh()`:
- Store update is synchronous
- Router refresh triggers re-render
- Re-render reads from updated store

### No Loading States Between Sections
- "Current Default Baby" and "Other Babies" sections both render on mount
- No skeleton states → data loaded in server component
- Loading state only shown during **switch action** (button text change)

## Related
- `.readme/chunks/baby-management.edit-functionality.md` - Baby editing patterns
- `.readme/chunks/account.baby-multi-tenancy.md` - Multi-baby access control
- `.readme/chunks/architecture.route-structure.md` - Route group patterns
