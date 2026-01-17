---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/loading.tsx
  - src/app/[locale]/(auth)/(center)/loading.tsx
---

# Suspense-Based Loading States

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Provide route-level loading UI for auth and auth-center routes using Next.js loading boundaries.

## Key Deviations from Standard

- **Two loading scopes**: `(auth)/loading.tsx` covers app pages, while `(auth)/(center)/loading.tsx` overrides for Clerk routes.
- **Skeleton-first**: Auth routes render skeleton blocks instead of spinners.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/loading.tsx` - Skeleton-based loading for app pages.
- `src/app/[locale]/(auth)/(center)/loading.tsx` - Centered spinner + label for auth forms.

### Data Flow
1. Next.js renders the nearest `loading.tsx` while a route is streaming.
2. `(auth)/(center)/loading.tsx` overrides the parent for sign-in/up routes.

### Code Pattern
```tsx
export default function Loading() {
  return (
    <div className="animate-in space-y-6 duration-300 fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `fade-in duration` | `300ms` | Fade-in animation used on auth loading state.
| `center loading text` | `Loading...` | Label shown under spinner in center layout.

## Gotchas / Constraints

- **Automatic only**: `loading.tsx` is shown automatically; it cannot be triggered manually.
- **Layout differences**: Center loading does not include `min-h-screen`, so its parent must provide height.

## Testing Notes

- Navigate between auth routes and verify skeletons appear briefly.
- Open `/sign-in` and confirm centered spinner + label renders.

## Related Systems

- `.readme/chunks/performance.skeleton-components.md` - Reusable skeletons.
- `.readme/chunks/auth.route-group-structure.md` - Loading scope boundaries.
