---
last_verified_at: 2026-01-04T12:00:00Z
source_paths:
  - src/app/[locale]/(auth)/loading.tsx
  - src/app/[locale]/(auth)/(center)/loading.tsx
---

# Suspense-Based Loading States

## Purpose
Implements route-level loading UI using Next.js Suspense pattern to provide instant visual feedback during navigation and server-side rendering.

## Key Deviations from Standard
- **Dual Loading Files**: Separate `loading.tsx` for `(auth)` and `(center)` route groups
- **Override Pattern**: Center loading overrides parent to prevent double loaders with Clerk
- **Skeleton UI**: Uses reusable skeleton components instead of generic spinners

## Implementation

### Route Structure
```
src/app/[locale]/(auth)/
├── loading.tsx                    ← Main auth loading (all auth routes)
├── (app)/
│   ├── dashboard/page.tsx        ✓ Uses parent loading
│   ├── settings/page.tsx         ✓ Uses parent loading
├── (center)/
│   ├── loading.tsx                ← Override loading (Clerk routes)
│   ├── sign-in/[[...sign-in]]/page.tsx   ✓ Uses center loading
│   └── sign-up/[[...sign-up]]/page.tsx   ✓ Uses center loading
```

### Primary Loading State (`(auth)/loading.tsx`)
**Coverage**: All auth routes except `(center)`
**Purpose**: Show skeleton UI while server renders page components

```typescript
export default function AuthLoading() {
  return (
    <div className="animate-in fade-in duration-200">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
```

**Animation**: Smooth 200ms fade-in using Tailwind CSS utility classes

### Center Loading Override (`(center)/loading.tsx`)
**Coverage**: Sign-in, sign-up pages (Clerk components)
**Purpose**: Simple spinner to avoid duplicate loading states

```typescript
export default function CenterLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
```

**Rationale**: Clerk components have their own internal loading states, so just show minimal spinner during route transition.

## Patterns

### When to Add loading.tsx
1. **Route Group Level**: Place in route group directory to apply to all nested routes
2. **Route-Specific**: Place in page directory to override parent loading state
3. **Skeleton Selection**: Choose skeleton components based on page content:
   - Dashboard → `PageHeaderSkeleton` + `CardSkeleton`
   - Lists → `ListSkeleton`
   - Tables → `TableSkeleton`
   - Charts → `ChartSkeleton`

### Loading Hierarchy
```
(auth)/loading.tsx              ← Default for all auth routes
  ├── (app)/dashboard/          ← Inherits from parent
  ├── (app)/settings/           ← Inherits from parent
  └── (center)/loading.tsx      ← Overrides parent
      ├── sign-in/              ← Uses center loading
      └── sign-up/              ← Uses center loading
```

## Gotchas
- **Automatic Trigger**: Next.js automatically shows `loading.tsx` during navigation and streaming
- **No Manual Control**: Cannot programmatically trigger/hide loading state - it's automatic
- **Suspense Boundaries**: Works with React Suspense - components can suspend during data fetching
- **Static Content**: Loading state only shows if page has async operations (data fetching, dynamic imports)

## User Experience Flow
1. User clicks navigation link → Route change initiated
2. Next.js immediately shows `loading.tsx` → Instant visual feedback
3. Server streams page content → Progressive rendering
4. Page ready → `loading.tsx` automatically removed

## Related
- `.readme/chunks/performance.skeleton-components.md` - Reusable skeleton component library
- `.readme/chunks/architecture.route-structure.md` - Route group organization
