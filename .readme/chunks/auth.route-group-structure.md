---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
  - src/app/[locale]/(auth)/(app)/layout.tsx
---

# Auth Route Group Structure

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Separate authenticated app pages from centered auth forms using nested route groups under `(auth)`.

## Key Deviations from Standard

- **Nested auth groups**: `(auth)` wraps all protected routes, while `(auth)/(center)` is reserved for auth forms.
- **App shell group**: `(auth)/(app)` applies `AppShell` to main product pages.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/layout.tsx` - ClerkProvider wrapper for all auth routes.
- `src/app/[locale]/(auth)/(app)/layout.tsx` - AppShell layout for product pages.
- `src/app/[locale]/(auth)/(center)/layout.tsx` - Centered layout for sign-in/up.

### Data Flow
1. Root layout handles locale and global providers.
2. `(auth)` layout adds ClerkProvider and localized auth URLs.
3. `(app)` routes render inside `AppShell`, while `(center)` routes render in a centered container.

### Code Pattern
```tsx
return (
  <AppShell locale={locale} variant="unwrapped">
    {props.children}
  </AppShell>
);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `AppShell.variant` | `unwrapped` | Layout mode used for authenticated app pages.
| `centeredLayout` | `min-h-screen` | Centered auth pages use full-height flex container.

## Gotchas / Constraints

- **Catch-all auth routes**: Sign-in/up pages live under `(center)/sign-in/[[...sign-in]]` and `(center)/sign-up/[[...sign-up]]`.
- **Route groups are invisible in URLs**: `(auth)` and `(center)` do not appear in the path.

## Testing Notes

- Confirm `/sign-in` renders centered layout and `/overview` renders AppShell layout.
- Verify ClerkProvider is present in both `(app)` and `(center)` routes.

## Related Systems

- `.readme/chunks/architecture.route-structure.md` - Overall route organization.
- `.readme/chunks/auth.clerk-layout-pattern.md` - ClerkProvider scoping details.
