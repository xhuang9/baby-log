---
last_verified_at: 2026-01-04T12:00:00Z
source_paths:
  - src/components/navigation/AppHeader.tsx
  - src/stores/useBreadcrumbStore.ts
---

# Mobile Back Button Navigation

## Purpose
Provides intelligent back navigation on mobile devices in the AppHeader component, using breadcrumb hierarchy to determine navigation target.

## Key Deviations from Standard

Unlike standard mobile back buttons that only use browser history (`router.back()`), this implementation intelligently navigates based on the current page's breadcrumb hierarchy:

- **Multi-level pages**: Navigates to parent (first breadcrumb item)
- **Top-level pages**: Falls back to browser back navigation
- **Visual feedback**: Shows/hides back button based on breadcrumb presence

## Implementation

### Location
`src/components/navigation/AppHeader.tsx` (lines 36-48)

### Navigation Logic

```typescript
const handleMobileBack = () => {
  if (breadcrumbs.length > 1) {
    // Multiple levels: navigate to parent (first breadcrumb)
    const parentHref = breadcrumbs[0]?.href;
    if (parentHref) {
      router.push(parentHref);
    }
  } else {
    // Single level or no breadcrumbs: browser back
    router.back();
  }
};
```

### UI Rendering

```typescript
{hasBreadcrumbs
  ? (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleMobileBack}
        aria-label="返回"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
    )
  : (
      <div className="h-8 w-8 shrink-0" />  // Spacer for consistent layout
    )}
```

## When Back Button Shows

### Visible (with breadcrumbs)
Pages using `BreadcrumbSetter` or `useSetBreadcrumb`:

```typescript
// Settings > User Profile
<BreadcrumbSetter
  items={[
    { label: 'Settings', href: getI18nPath('/settings', locale) },
    { label: 'User Profile' },
  ]}
/>
// Result: Back button navigates to /settings
```

### Hidden (no breadcrumbs)
Pages using only `PageTitleSetter` or `useSetPageTitle`:

```typescript
// Dashboard (top-level)
<PageTitleSetter title="Dashboard" />
// Result: No back button, spacer div maintains layout
```

## Behavior Examples

### Scenario 1: Nested Settings Page
**Page**: Settings > User Profile
**Breadcrumbs**: `[{ label: 'Settings', href: '/settings' }, { label: 'User Profile' }]`
**Action**: Tap back button
**Result**: Navigate to `/settings` (parent breadcrumb)

### Scenario 2: Dashboard (Top-Level)
**Page**: Dashboard
**Breadcrumbs**: None
**Action**: No back button visible
**Result**: Spacer div maintains header layout

### Scenario 3: Single-Level with History
**Page**: Activities
**Breadcrumbs**: `[{ label: 'Activities' }]` (single item, no href)
**Action**: Tap back button
**Result**: `router.back()` to previous page in history

## Mobile Layout Structure

The mobile header uses a three-column layout (visible below `md` breakpoint):

```
┌──────────────────────────────────────┐
│ [←]    Page Title      [👤]           │
└──────────────────────────────────────┘
 Left    Center         Right
 (40px)  (flexible)     (40px)
```

### Layout Code

```typescript
<div className="flex w-full items-center justify-between md:hidden">
  {/* Left: Back Button or Spacer */}
  {hasBreadcrumbs ? <Button.../> : <div className="h-8 w-8 shrink-0" />}

  {/* Center: Page Title */}
  {pageTitle && (
    <span className="truncate text-sm font-medium">{pageTitle}</span>
  )}

  {/* Right: User Button */}
  <div className="flex shrink-0 items-center gap-2">
    <UserButton {...} />
  </div>
</div>
```

## Key Technical Details

### Zustand Store Integration

The component reads breadcrumb state from Zustand store (not React Context):

```typescript
import { useBreadcrumbStore } from '@/stores/useBreadcrumbStore';

const breadcrumbs = useBreadcrumbStore(state => state.breadcrumbs);
const pageTitle = useBreadcrumbStore(state => state.pageTitle);
```

**Why Zustand**: Allows client component to access global state without wrapping entire app in React Context Provider.

### Icon Library

Uses Lucide React for the chevron icon:

```typescript
import { ChevronLeft } from 'lucide-react';
```

### Accessibility

- `aria-label="返回"` provides screen reader label (Chinese: "back")
- Ghost button variant for subtle appearance
- Icon-only button with proper size (`h-8 w-8`)

## Responsive Behavior

- **Mobile (`< md` breakpoint)**: Shows back button + title layout
- **Desktop (`≥ md` breakpoint)**: Shows breadcrumbs instead (different layout)

The mobile layout is completely hidden on desktop via `md:hidden` class, and desktop layout is hidden on mobile via `hidden md:flex`.

## Gotchas

### Parent Must Have Href

For multi-level navigation to work, the **first breadcrumb item must include `href`**:

```typescript
// ✓ Correct - back button navigates to /settings
items={[
  { label: 'Settings', href: getI18nPath('/settings', locale) },
  { label: 'User Profile' },
]}

// ✗ Wrong - back button falls back to router.back()
items={[
  { label: 'Settings' },  // Missing href!
  { label: 'User Profile' },
]}
```

### Spacer Div Necessity

The empty `<div className="h-8 w-8 shrink-0" />` when no breadcrumbs is **required** to maintain the three-column layout:

- Without it: Title would left-align instead of centering
- With it: Title stays centered, UserButton stays right-aligned

### Theme Toggle Visibility

Note that `ThemeToggle` is **only** shown in mobile layout (removed from desktop layout in this implementation). Desktop layout shows ThemeToggle + UserButton together.

## Related Components

- **useBreadcrumbStore** (`src/stores/useBreadcrumbStore.ts`) - Global state management
- **BreadcrumbSetter** - Sets breadcrumbs from server components
- **PageTitleSetter** - Sets simple page title
- **SidebarTrigger** - Desktop-only menu toggle (hidden on mobile)

## Migration Notes

### From React Context to Zustand

Original implementation used React Context (`useBreadcrumb()` hook). Current version uses Zustand store for simpler state management:

```typescript
// Old (React Context)
const { breadcrumbs, pageTitle } = useBreadcrumb();

// New (Zustand)
const breadcrumbs = useBreadcrumbStore(state => state.breadcrumbs);
const pageTitle = useBreadcrumbStore(state => state.pageTitle);
```

**Benefit**: No need for context provider wrapping, simpler component tree.
