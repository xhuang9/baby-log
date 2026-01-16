---
last_verified_at: 2026-01-16T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx
  - src/components/feed/AmountSlider.tsx
  - src/components/feed/TimeSwiper.tsx
---

# Feed Logging UI Components

## Purpose

Reusable UI components for displaying and adding feed logs with mobile-first design, hand-mode ergonomics, and bottom sheet interaction pattern.

## Component Hierarchy

```
FeedTile (stateful)
├── ActivityTile (presentation)
└── AddFeedModal (full-screen sheet form)
    ├── TimeSwiper (start time picker)
    ├── AmountSlider (bottle feed amount with settings)
    ├── Duration input (breast feed minutes)
    └── End side radio buttons (breast feed L/R)
```

## Key Patterns

### 1. Activity Tile Pattern

**Location**: `src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx`

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

### 2. Full-Screen Bottom Sheet Pattern

**Location**: `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx`

**Non-Standard Choices**:

#### A. Full-Screen Sheet

```tsx
<Sheet open={open} onOpenChange={handleOpenChange}>
  <SheetContent
    side="bottom"
    className="inset-0 h-full w-full rounded-none"
    showCloseButton={false}
  >
```

**Pattern**: Full-screen overlay with `inset-0 h-full w-full rounded-none`.
**Why**: More space for TimeSwiper and AmountSlider controls, immersive mobile experience.

#### B. Centered Fixed Header

```tsx
<SheetHeader className="relative flex-row items-center border-b pb-4 space-y-0">
  <SheetClose render={<Button variant="ghost" size="icon-sm" />}>
    <ChevronLeftIcon className="h-5 w-5" />
  </SheetClose>

  <SheetTitle className="absolute left-1/2 -translate-x-1/2">
    Feed
  </SheetTitle>

  <Button
    variant="ghost"
    size="sm"
    onClick={() => setInputMode(...)}
    className="ml-auto text-primary"
  >
    {inputMode === 'manual' ? 'Timer' : 'Manual'}
  </Button>
</SheetHeader>
```

**Pattern**: Left back button (ChevronLeft), absolutely centered title, right mode switcher.
**Why**:
- iOS-style back navigation (familiar pattern)
- Centered title for symmetry
- Mode switcher always visible (no need to hunt for it)

**Change from previous**: Was X icon + Cancel text, now ChevronLeft icon only.

#### C. Max-Width Constrained Content

```tsx
<div className="mx-auto w-full max-w-[600px] space-y-6 px-4 py-6">
  {/* Form fields */}
</div>
```

**Pattern**: Content area and footer both have `max-w-[600px]` constraint.
**Why**: Prevents inputs from being too wide on tablets/desktop, keeps controls reachable.

#### D. Hand-Mode Aware Footer

```tsx
<SheetFooter className={`mx-auto w-full max-w-[600px] flex-row gap-4 border-t px-4 pt-4 ${handMode === 'left' ? 'justify-start' : 'justify-end'}`}>
  <BaseButton variant="secondary">Cancel</BaseButton>
  <BaseButton variant="primary" loading={isSubmitting}>Save</BaseButton>
</SheetFooter>
```

**Pattern**: Footer buttons flip based on hand mode:
- Right-handed: Cancel on left, Save on right (default)
- Left-handed: Cancel on right, Save on left

**Why**: Primary action (Save) is always closest to the user's dominant thumb.

**Change from previous**: Buttons were full-width `flex-1`, now natural width with gap.

#### E. Method Toggle with ButtonGroup

```tsx
<ButtonGroup className="w-full">
  <Button
    variant={method === 'bottle' ? 'default' : 'outline'}
    className="h-12 flex-1"
    onClick={() => setMethod('bottle')}
  >
    Bottle Feeding
  </Button>
  <Button
    variant={method === 'breast' ? 'default' : 'outline'}
    className="h-12 flex-1"
    onClick={() => setMethod('breast')}
  >
    Breast Feeding
  </Button>
</ButtonGroup>
```

**Pattern**: Full-width button group with explicit "Bottle Feeding" / "Breast Feeding" labels.
**Change**: Was "Bottle" / "Breast" (shorter), now more explicit.

#### F. Conditional Form Fields

```tsx
{method === 'bottle' && (
  <div className="space-y-3">
    <Label className="text-muted-foreground">Amount</Label>
    <AmountSlider value={amountMl} onChange={setAmountMl} handMode={handMode} />
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
**Change**: Bottle amount now uses AmountSlider (with settings) instead of plain Slider.

#### G. Time Picker with Label

```tsx
<div className="space-y-3">
  <Label className="text-muted-foreground">Start time</Label>
  <TimeSwiper value={startTime} onChange={setStartTime} handMode={handMode} />
</div>
```

**Pattern**: Label above TimeSwiper (was embedded in TimeSwiper before).
**Why**: Consistent with AmountSlider pattern, clearer form structure.
**Change**: TimeSwiper no longer shows label internally, parent provides it.

### 3. TimeSwiper Component

**Location**: `src/components/feed/TimeSwiper.tsx`

Horizontal swipe timeline with momentum physics, persistent settings (24h format, swipe speed, magnetic feel), and hand-mode layout mirroring.

**Key Pattern**: Wait-for-hydration before loading settings from IndexedDB.

**Change**: Removed `userId` prop, now loads directly from Zustand store.

```typescript
// OLD (prop drilling)
<TimeSwiper userId={user?.localId} ... />

// NEW (store-based)
<TimeSwiper ... /> // Loads userId from useUserStore internally
```

### 4. AmountSlider Component

**Location**: `src/components/feed/AmountSlider.tsx`

**Full documentation**: `.readme/chunks/feed-logging.amount-slider.md`

**Key features**:
- Settings popover (min/max/increment/drag step/flip direction)
- Metric/imperial conversion (ml ↔ oz)
- Hand-mode layout mirroring
- IndexedDB persistence with wait-for-hydration
- Thicker touch targets (h-3 track, size-7 thumb)

### 5. Time Ago Formatting

**Location**: `src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx`

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

### 6. Feed Subtitle Formatting

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

- **Sheet Side**: Uses `side="bottom"` for mobile-first full-screen pattern
- **No Close Button**: `showCloseButton={false}` because header has back button
- **Full Screen**: `inset-0 h-full w-full rounded-none` for immersive mobile UX
- **Max Width**: Content constrained to 600px to keep controls reachable on tablets
- **Form Reset**: Always reset on cancel/close to avoid stale state
- **Time Defaults**: Initialize to current time for convenience
- **Hand Mode**: Loaded from IndexedDB on mount, affects layout of TimeSwiper, AmountSlider, and footer buttons
- **Amount Range**: Configurable via AmountSlider settings, defaults to 0-350ml
- **Duration Max**: 60 minutes max for breast feeds (typical maximum)
- **Wait for Hydration**: TimeSwiper and AmountSlider wait for store hydration before loading settings

## Related

- `chunks/feed-logging.server-actions.md` - Server-side feed creation logic
- `chunks/feed-logging.amount-slider.md` - AmountSlider component details
- `chunks/local-first.ui-config-storage.md` - UI config persistence system
- `chunks/local-first.store-hydration-pattern.md` - Store hydration and wait pattern
- `chunks/performance.loading-states.md` - Loading patterns for async actions
