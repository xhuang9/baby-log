---
last_verified_at: 2026-01-25T14:30:00Z
expired_reason: "AppHeader.tsx modified"
source_paths:
  - src/stores/useBreadcrumbStore.ts
  - src/components/navigation/AppHeader.tsx
---

# Breadcrumb and Page Title System

**⚠️ EXPIRED**: Awaiting refresh.

## Purpose
Provides a Zustand-based global state system for displaying navigation breadcrumbs or page titles in the AppHeader, with intelligent mobile back button navigation.

## The Server/Client Component Problem

**Core Issue:** Next.js pages are server components by default (allowing async/await, Clerk server functions, direct DB access), but client-side state management (Zustand) requires hooks that only work in client components.

**Standard Approaches Don't Work:**
- Can't use `useBreadcrumbStore()` directly in server component pages
- Converting entire page to `'use client'` loses server component benefits (async data fetching, etc.)

**This Project's Solution:** Setter hooks pattern - small utility hooks that manage state with auto-cleanup.

## Architecture Components

### 1. Breadcrumb Store (Zustand)
**Location:** `src/stores/useBreadcrumbStore.ts`

**Purpose:** Global Zustand store managing breadcrumb and page title state.

**Exports:**
- `useBreadcrumbStore` - Zustand store hook for accessing state
- `useSetBreadcrumb(items)` - Hook to set breadcrumbs with auto-cleanup on unmount
- `useSetPageTitle(title)` - Hook to set simple page title with auto-cleanup

**Store Shape:**
```typescript
type BreadcrumbStore = {
  breadcrumbs: BreadcrumbItem[];
  pageTitle: string | null;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setPageTitle: (title: string | null) => void;
};
```

**Integration:** No provider needed - Zustand stores are globally accessible.

### 2. useSetBreadcrumb Hook
**Location:** `src/stores/useBreadcrumbStore.ts`

**Purpose:** Hook that sets breadcrumbs with automatic cleanup on component unmount.

**Usage:**
```typescript
type BreadcrumbItem = {
  label: string; // Display text
  href?: string; // Optional link (last item typically omitted for current page)
};

useSetBreadcrumb([
  { label: 'Settings', href: '/settings' },
  { label: 'User Profile' },
]);
```

**Behavior:** Sets breadcrumbs in store, clears them on unmount.

### 3. useSetPageTitle Hook
**Location:** `src/stores/useBreadcrumbStore.ts`

**Purpose:** Hook that sets simple page title with automatic cleanup on unmount.

**Usage:**
```typescript
useSetPageTitle('Dashboard');
```

**Behavior:** Sets page title in store, clears it on unmount.

### 4. AppHeader Integration
**Location:** `src/components/navigation/AppHeader.tsx`

**Display Logic:**
- Reads `breadcrumbs` and `pageTitle` from Zustand store via `useBreadcrumbStore()`
- **Desktop**: Renders shadcn `<Breadcrumb>` components or page title
- **Mobile**: Renders intelligent back button + centered page title
- Shows nothing if neither breadcrumbs nor page title is set

**Mobile Navigation:**
See `.readme/chunks/architecture.mobile-back-button.md` for detailed mobile back button behavior.

## Usage Patterns

### Pattern 1: Navigation Breadcrumbs (Multi-Level Pages)
Use when page has parent pages in navigation hierarchy.

```typescript
'use client';

import { useSetBreadcrumb } from '@/stores/useBreadcrumbStore';
import { getI18nPath } from '@/utils/Helpers';

export default function UserProfilePage() {
  useSetBreadcrumb([
    { label: 'Settings', href: getI18nPath('/settings', locale) },
    { label: 'User Profile' }, // Current page - no href
  ]);

  return (
    {/* Page content */}
  );
}
```

**When to Use:**
- Settings subpages
- Nested configuration screens
- Multi-step workflows

**Mobile Behavior:** Shows back button that navigates to parent breadcrumb (Settings).

### Pattern 2: Simple Page Title (Top-Level Pages)
Use when page is a top-level destination without parent pages.

```typescript
'use client';

import { useSetPageTitle } from '@/stores/useBreadcrumbStore';

export default function DashboardPage() {
  useSetPageTitle('Dashboard');

  return (
    {/* Page content */}
  );
}
```

**When to Use:**
- Dashboard
- Activities list
- Analytics overview
- Top-level navigation items

**Mobile Behavior:** No back button shown (only spacer for layout consistency).

## Key Deviations from Standard Patterns

### Non-Standard: Zustand for UI State
Most Next.js apps use React Context for breadcrumb state. This project uses Zustand for simpler global state management without provider wrapping.

**Benefit:** No provider needed, easier to access from any component, simpler component tree.

### Non-Standard: Dual Display Mode
AppHeader conditionally renders breadcrumbs OR page title from same store, rather than separate systems.

**Benefit:** Single source of truth, consistent API, automatic cleanup.

### Non-Standard: Intelligent Mobile Back Button
Mobile back button uses breadcrumb hierarchy to determine navigation target (parent or browser back).

**See:** `.readme/chunks/architecture.mobile-back-button.md` for detailed behavior.

## Auto-Cleanup Behavior

Both `useSetBreadcrumb()` and `useSetPageTitle()` include cleanup in their `useEffect` return:

```typescript
useEffect(() => {
  setBreadcrumbs(items);
  return () => {
    setBreadcrumbs([]); // Cleanup on unmount
  };
}, [items, setBreadcrumbs]);
```

**Implication:** When navigating away from a page, breadcrumbs/title automatically clear. AppHeader shows nothing until new page sets its breadcrumb/title.

## Gotchas

### Locale-Aware Links
Always use `getI18nPath()` helper for breadcrumb `href` values:

```typescript
// Correct
{ label: 'Settings', href: getI18nPath('/settings', locale) }

// Wrong - misses locale prefix
{ label: 'Settings', href: '/settings' }
```

### Last Item Convention
By convention, the last breadcrumb item (current page) should NOT have an `href`:

```typescript
items={[
  { label: 'Settings', href: getI18nPath('/settings', locale) },
  { label: 'User Profile' }, // ✓ No href - current page
]}
```

AppHeader renders last item as `<BreadcrumbPage>` (non-clickable) vs. `<BreadcrumbLink>`.

### Mobile Display
Desktop shows breadcrumbs in header. Mobile shows intelligent back button + centered page title instead.

**See:** `.readme/chunks/architecture.mobile-back-button.md` for mobile navigation details.

## Related Components

- **AppHeader** - Consumes breadcrumb/title state for display
- **Mobile Back Button** - Intelligent navigation using breadcrumb hierarchy (see `.readme/chunks/architecture.mobile-back-button.md`)
- **shadcn Breadcrumb** - UI components from `src/components/ui/breadcrumb.tsx`

## Integration with Shadcn

Uses shadcn breadcrumb components with custom render prop for Next.js Link integration:

```typescript
<BreadcrumbLink render={props => (
  <Link href={item.href!} {...props}>
    {item.label}
  </Link>
)} />
```

This allows client-side navigation while maintaining shadcn styling.
