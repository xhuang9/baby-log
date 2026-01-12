---
last_verified_at: 2026-01-04T12:00:00Z
source_paths:
  - src/components/ui/page-skeleton.tsx
---

# Skeleton Loading Components

## Purpose
Provides reusable skeleton UI components for consistent loading states across the application, matching the visual structure of actual content.

## Key Deviations from Standard
- **Content-Aware Skeletons**: Each skeleton matches specific content patterns (headers, cards, lists, tables, charts)
- **Tailwind Animation**: Uses `animate-pulse` utility for smooth shimmer effect
- **Composable Design**: Mix and match skeleton components to match page layout

## Implementation

### Available Components

#### 1. PageHeaderSkeleton
**Use Case**: Page titles and descriptions
```tsx
<PageHeaderSkeleton />;
```
**Output**: Title line (200px) + description lines (full width)

#### 2. CardSkeleton
**Use Case**: Card-based content blocks
```tsx
<CardSkeleton />;
```
**Output**: Card container with header + content lines

#### 3. ListSkeleton
**Use Case**: List items with avatars/icons
```tsx
<ListSkeleton count={5} />;
```
**Props**:
- `count?: number` - Number of list items (default: 3)

**Output**: Avatar circle + two text lines per item

#### 4. TableSkeleton
**Use Case**: Tabular data
```tsx
<TableSkeleton rows={5} columns={4} />;
```
**Props**:
- `rows?: number` - Number of table rows (default: 3)
- `columns?: number` - Number of columns (default: 3)

**Output**: Table header + data rows

#### 5. ChartSkeleton
**Use Case**: Chart/graph placeholders
```tsx
<ChartSkeleton />;
```
**Output**: Rectangular chart container with pulse animation

## Patterns

### Composition Example
```tsx
// Dashboard loading state
export default function DashboardLoading() {
  return (
    <div className="animate-in duration-200 fade-in">
      <PageHeaderSkeleton />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="mt-8">
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}
```

### Creating Custom Skeletons
Follow the pattern in `page-skeleton.tsx`:
```tsx
export function CustomSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
```

**Key Classes**:
- `animate-pulse` - Built-in Tailwind shimmer animation
- `bg-muted` - Theme-aware skeleton color
- `rounded` - Match border radius of actual content

## Component Structure

### Internal Implementation
```tsx
// Example: CardSkeleton
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      {/* Header */}
      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />

      {/* Content lines */}
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
```

### Sizing Guidelines
- **Title**: `h-6` or `h-8`
- **Body text**: `h-4`
- **Avatars**: `size-10` or `size-12`
- **Widths**: Use fractional widths (`w-1/2`, `w-3/4`) for natural variation

## Gotchas
- **Theme Compatibility**: `bg-muted` automatically adapts to light/dark mode
- **Animation Performance**: `animate-pulse` is GPU-accelerated, safe for multiple instances
- **Responsive Design**: Wrap in responsive grid/flex containers, not inside skeleton components
- **Content Matching**: Skeleton should roughly match actual content height to prevent layout shift

## Best Practices
1. **Match Layout**: Skeleton structure should mirror actual content structure
2. **Consistent Timing**: Use same fade-in animation (`animate-in fade-in duration-200`) in loading.tsx
3. **Progressive Disclosure**: For complex pages, show skeleton in priority order (header → main content → secondary)
4. **Avoid Overuse**: Only skeleton above-the-fold content, let below-fold content load naturally

## Related
- `.readme/chunks/performance.loading-states.md` - Route-level loading.tsx implementation
- `.readme/chunks/architecture.route-structure.md` - Route organization for loading states
