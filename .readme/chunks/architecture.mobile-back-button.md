---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/components/navigation/AppHeader.tsx
  - src/stores/useBreadcrumbStore.ts
---

# Mobile Back Button Navigation

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Provide context-aware back navigation in the mobile header based on breadcrumb state rather than relying solely on browser history.

## Key Deviations from Standard

- **Breadcrumb-driven back**: The back button uses the first breadcrumb `href` when available instead of always calling `router.back()`.

## Architecture / Implementation

### Components
- `src/components/navigation/AppHeader.tsx` - Mobile header layout and back button handler.
- `src/stores/useBreadcrumbStore.ts` - Global breadcrumb + page title state and setter hooks.

### Data Flow
1. Pages call `useSetBreadcrumb` or `useSetPageTitle` to populate the store.
2. `AppHeader` reads `breadcrumbs` and `pageTitle`.
3. If breadcrumbs exist, show back button; on click push to the first breadcrumb `href` or fall back to `router.back()`.

### Code Pattern
```tsx
const handleMobileBack = () => {
  if (breadcrumbs.length > 1) {
    const parentHref = breadcrumbs[0]?.href;
    if (parentHref) {
      router.push(parentHref);
    }
  } else {
    router.back();
  }
};
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `BreadcrumbItem.href` | `undefined` | When missing, back button falls back to `router.back()`.
| `pageTitle` | `null` | Used for header title when breadcrumbs are empty.

## Gotchas / Constraints

- **Parent href required**: The first breadcrumb needs an `href` for parent navigation; otherwise the back button uses history.
- **Lifecycle cleanup**: `useSetBreadcrumb` and `useSetPageTitle` clear values on unmount, so pages must set them on render.

## Testing Notes

- On mobile widths, verify back button appears when breadcrumbs are set.
- Confirm `aria-label="back to previous page"` and `router.back()` behavior with a single breadcrumb.

## Related Systems

- `.readme/chunks/architecture.route-structure.md` - Route grouping that influences breadcrumb paths.
- `.readme/chunks/architecture.breadcrumb-system.md` - Breadcrumb setters and usage patterns.
