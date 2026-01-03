---
last_verified_at: 2026-01-04T10:30:00Z
source_paths:
  - src/components/providers/BreadcrumbProvider.tsx
  - src/components/navigation/BreadcrumbSetter.tsx
  - src/components/navigation/PageTitleSetter.tsx
  - src/components/navigation/AppHeader.tsx
  - src/templates/AppShell.tsx
---

# Breadcrumb and Page Title System

## Purpose
Provides a React Context-based system for displaying navigation breadcrumbs or page titles in the AppHeader, solving the server/client component boundary issue inherent in Next.js App Router.

## The Server/Client Component Problem

**Core Issue:** Next.js pages are server components by default (allowing async/await, Clerk server functions, direct DB access), but React Context hooks require client components.

**Standard Approaches Don't Work:**
- Can't use `useBreadcrumb()` directly in server component pages
- Converting entire page to `'use client'` loses server component benefits (async data fetching, etc.)

**This Project's Solution:** Setter components pattern - small client components that bridge the gap.

## Architecture Components

### 1. BreadcrumbProvider (Context)
**Location:** `src/components/providers/BreadcrumbProvider.tsx`

**Purpose:** Global client component context managing breadcrumb and page title state.

**Exports:**
- `BreadcrumbProvider` - Wraps app at root (in AppShell)
- `useBreadcrumb()` - Access breadcrumb/title state (read-only)
- `useSetBreadcrumb(items)` - Set breadcrumbs with auto-cleanup on unmount
- `useSetPageTitle(title)` - Set simple page title with auto-cleanup

**Integration Point:** Wrapped around SidebarProvider in `src/templates/AppShell.tsx` (line 17).

### 2. BreadcrumbSetter Component
**Location:** `src/components/navigation/BreadcrumbSetter.tsx`

**Purpose:** Client component that calls `useSetBreadcrumb()` hook. Use this in server component pages.

**Props:**
```typescript
type BreadcrumbItem = {
  label: string;    // Display text
  href?: string;    // Optional link (last item typically omitted for current page)
};

<BreadcrumbSetter items={BreadcrumbItem[]} />
```

**Behavior:** Returns `null` (no render), only sets context state.

### 3. PageTitleSetter Component
**Location:** `src/components/navigation/PageTitleSetter.tsx`

**Purpose:** Client component that calls `useSetPageTitle()` hook. Use for simple pages without navigation hierarchy.

**Props:**
```typescript
<PageTitleSetter title={string} />
```

**Behavior:** Returns `null` (no render), only sets context state.

### 4. AppHeader Integration
**Location:** `src/components/navigation/AppHeader.tsx`

**Display Logic:**
- Desktop only (hidden on mobile via `hidden md:flex`)
- Reads `breadcrumbs` and `pageTitle` from context via `useBreadcrumb()`
- Renders shadcn `<Breadcrumb>` components if breadcrumbs exist
- Falls back to plain text `<span>` if only page title exists
- Shows nothing if neither is set

## Usage Patterns

### Pattern 1: Navigation Breadcrumbs (Multi-Level Pages)
Use when page has parent pages in navigation hierarchy.

```typescript
import { BreadcrumbSetter } from '@/components/navigation/BreadcrumbSetter';
import { getI18nPath } from '@/utils/Helpers';

export default async function UserProfilePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Settings', href: getI18nPath('/settings', locale) },
          { label: 'User Profile' }, // Current page - no href
        ]}
      />
      {/* Page content */}
    </>
  );
}
```

**When to Use:**
- Settings subpages
- Nested configuration screens
- Multi-step workflows

**Example in Codebase:** `src/app/[locale]/(auth)/(app-unwrapped)/settings/user-profile/[[...user-profile]]/page.tsx`

### Pattern 2: Simple Page Title (Top-Level Pages)
Use when page is a top-level destination without parent pages.

```typescript
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';

export default function DashboardPage() {
  return (
    <>
      <PageTitleSetter title="Dashboard" />
      {/* Page content */}
    </>
  );
}
```

**When to Use:**
- Dashboard
- Activities list
- Analytics overview
- Top-level navigation items

**Examples in Codebase:**
- `src/app/[locale]/(auth)/(app)/dashboard/page.tsx`
- `src/app/[locale]/(auth)/(app)/activities/page.tsx`
- `src/app/[locale]/(auth)/(app)/analytics/page.tsx`

### Pattern 3: Direct Hook Usage (Client Components Only)
**Avoid unless entire page is already client component.**

```typescript
'use client';

import { useSetBreadcrumb } from '@/components/providers/BreadcrumbProvider';

export function MyClientPage() {
  useSetBreadcrumb([
    { label: 'Settings', href: '/settings' },
    { label: 'Profile' },
  ]);
  // ...
}
```

**When to Use:** Rare - only if page must be client component for other reasons (interactive state, browser APIs, etc.).

## Key Deviations from Standard Patterns

### Non-Standard: Setter Component Pattern
Most Next.js apps would require converting pages to client components to use context hooks. This pattern maintains server component benefits while using client context.

**Tradeoff:** Extra component indirection vs. server component capabilities (async/await, server-side auth checks, etc.).

### Non-Standard: Dual Display Mode
AppHeader conditionally renders breadcrumbs OR page title from same context, rather than separate systems.

**Benefit:** Single source of truth, consistent API, automatic cleanup.

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
Breadcrumbs and page titles are desktop-only (hidden below `md` breakpoint). Mobile navigation uses MobileBottomBar instead.

## Related Components

- **AppHeader** - Consumes breadcrumb/title state for display
- **AppShell** - Wraps app with BreadcrumbProvider
- **MobileBottomBar** - Mobile navigation alternative (doesn't use breadcrumbs)
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
