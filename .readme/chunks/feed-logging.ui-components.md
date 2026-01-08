---
last_verified_at: 2026-01-08T14:30:00Z
source_paths:
  - src/components/overview/FeedTile.tsx
  - src/components/overview/AddFeedSheet.tsx
  - src/components/overview/ActivityTile.tsx
  - src/components/ui/slider.tsx
---

# Feed Logging UI Components

## Purpose

Reusable UI components for displaying and adding feed logs with mobile-first design and bottom sheet interaction pattern.

## Component Hierarchy

```
FeedTile (stateful)
├── ActivityTile (presentation)
└── AddFeedSheet (form modal)
    ├── Sheet (shadcn/ui)
    └── Slider (custom Base UI component)
```

## Key Patterns

### 1. Activity Tile Pattern

**Location**: `src/components/overview/ActivityTile.tsx`

```typescript
export type ActivityTileProps = {
  title: string;
  subtitle: string;
  color: 'teal' | 'purple' | 'amber' | 'rose' | 'blue' | 'emerald';
  onClick?: () => void;
  rightContent?: ReactNode;
  className?: string;
};
```

**Design**: Reusable tile component for all activity types (Feed, Sleep, Nappy, etc.).

**Color System**:
```typescript
const colorClasses = {
  teal: 'border-l-teal-500 bg-teal-500/5 hover:bg-teal-500/10',
  purple: 'border-l-purple-500 bg-purple-500/5 hover:bg-purple-500/10',
  // ... etc
};
```

**Pattern**: Left border accent + subtle background tint (5% opacity, 10% on hover).

### 2. Bottom Sheet Form Pattern

**Location**: `src/components/overview/AddFeedSheet.tsx`

**Non-Standard Choices**:

#### A. Sheet Header with Cancel/Switch Actions

```tsx
<SheetHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b pb-4">
  <SheetClose render={<Button variant="ghost" size="sm" />}>
    Cancel
  </SheetClose>

  <SheetTitle className="text-center">
    Add {method === 'bottle' ? 'Bottle' : 'Breast'} Feed
  </SheetTitle>

  <Button variant="ghost" size="sm" onClick={() => setMethod(...)}>
    {method === 'bottle' ? 'Breast' : 'Bottle'}
  </Button>
</SheetHeader>
```

**Pattern**: Three-column header with action buttons (Cancel left, Switch right, Title center).
**Why**: Mobile-friendly, reduces taps (no need for separate method picker).

#### B. Custom Time Picker

```tsx
<input
  type="number"
  min={0}
  max={23}
  value={hour}
  className="h-16 w-20 rounded-lg border bg-background text-center text-2xl font-semibold"
/>
```

**Choice**: Custom numeric inputs instead of native time picker.
**Why**: Better UX on mobile, larger touch targets, instant validation.

#### C. Conditional Form Fields

```tsx
{method === 'bottle' && (
  <div className="space-y-3">
    {/* Amount Slider */}
  </div>
)}

{method === 'breast' && (
  <>
    {/* Duration Input */}
    {/* End Side Buttons */}
  </>
)}
```

**Pattern**: Different fields for bottle vs. breast feeds, no shared form state.

### 3. Slider Component (Base UI)

**Location**: `src/components/ui/slider.tsx`

**Library**: `@base-ui/react/slider` (not radix-ui).

**Custom Logic**:

```typescript
const _values = React.useMemo(
  () =>
    Array.isArray(value)
      ? value
      : Array.isArray(defaultValue)
        ? defaultValue
        : [min, max],
  [value, defaultValue, min, max]
)
```

**Why**: Handles both controlled and uncontrolled modes, always provides array for multi-thumb support.

**Styling Pattern**:

```tsx
<SliderPrimitive.Track className="bg-muted rounded-full data-horizontal:h-1">
  <SliderPrimitive.Indicator className="bg-primary" />
</SliderPrimitive.Track>
```

**Note**: Uses `data-horizontal`/`data-vertical` attributes for responsive sizing.

### 4. Time Ago Formatting

**Location**: `src/components/overview/FeedTile.tsx`

```typescript
function formatTimeAgo(date: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h ago` : `${diffDays}d ago`;
  }
  // ... etc
}
```

**Output Examples**:
- "Just now" (< 1 minute)
- "5m ago" (< 1 hour)
- "2h 15m ago" (< 1 day)
- "3d 4h ago" (> 1 day)

**Pattern**: Always shows two units when available (e.g., "2h 15m", not just "2h").

### 5. Feed Subtitle Formatting

```typescript
function formatFeedSubtitle(feed: FeedLogWithCaregiver | null): string {
  if (!feed) return 'Tap to log a feed';

  const timeAgo = formatTimeAgo(feed.startedAt);
  const caregiver = feed.caregiverLabel ? ` - by ${feed.caregiverLabel}` : '';

  if (feed.method === 'bottle') {
    return `${timeAgo} - ${feed.amountMl ?? 0}ml formula${caregiver}`;
  }

  // Breast feed
  const duration = feed.durationMinutes ? `${feed.durationMinutes}m` : '';
  const side = feed.endSide ? ` (end on ${feed.endSide})` : '';
  return `${timeAgo} - ${duration} breast feed${side}${caregiver}`;
}
```

**Examples**:
- `"2h 15m ago - 120ml formula - by Dad"`
- `"30m ago - 15m breast feed (end on right) - by Mom"`

## State Management

**Pattern**: Local component state only, no Zustand or context.

```typescript
const [method, setMethod] = useState<FeedMethod>('bottle');
const [hour, setHour] = useState(() => new Date().getHours());
const [minute, setMinute] = useState(() => new Date().getMinutes());
// ...
```

**Why**: Form state is transient, no need for global state or persistence.

**Reset on Close**:

```typescript
const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    resetForm();
  }
  onOpenChange(newOpen);
};
```

## Gotchas

- **Sheet Side**: Uses `side="bottom"` for mobile-first drawer pattern
- **No Close Button**: `showCloseButton={false}` because header has Cancel button
- **Form Reset**: Always reset on cancel/close to avoid stale state
- **Time Defaults**: Initialize to current time for convenience
- **Amount Range**: Slider max is 350ml (typical max for baby bottle)
- **Duration Max**: 60 minutes max for breast feeds (typical maximum)

## Related

- `chunks/feed-logging.server-actions.md` - Server-side feed creation logic
- `chunks/performance.loading-states.md` - Loading patterns for async actions
