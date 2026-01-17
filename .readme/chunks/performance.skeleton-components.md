---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/components/ui/page-skeleton.tsx
---

# Skeleton Loading Components

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Provide reusable skeleton components that match common page layouts for loading states.

## Key Deviations from Standard

- **Single source of truth**: All skeleton variants live in `page-skeleton.tsx` and share the same `Skeleton` primitive.

## Architecture / Implementation

### Components
- `src/components/ui/page-skeleton.tsx` - `PageHeaderSkeleton`, `CardSkeleton`, `ListSkeleton`, `TableSkeleton`, `ChartSkeleton`.

### Data Flow
1. Loading routes import skeletons from `page-skeleton.tsx`.
2. Skeletons render consistent spacing and sizes using the `Skeleton` primitive.

### Code Pattern
```tsx
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b pb-3">
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `ListSkeleton.count` | `3` | Number of list items to render.
| `TableSkeleton.rows` | `5` | Number of table rows to render.

## Gotchas / Constraints

- **Fixed columns**: `TableSkeleton` always renders four columns; there is no `columns` prop.
- **Width assumptions**: Skeleton widths are fractional; adjust only if layout changes.

## Testing Notes

- Use `ListSkeleton` with different counts to ensure spacing remains consistent.
- Verify skeletons align with content layout to avoid layout shift.

## Related Systems

- `.readme/chunks/performance.loading-states.md` - Route-level loading usage.
- `.readme/chunks/performance.instant-navigation.md` - Perceived performance patterns.
