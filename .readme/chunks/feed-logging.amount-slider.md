---
last_verified_at: 2026-01-16T00:00:00Z
source_paths:
  - src/components/feed/AmountSlider.tsx
---

# AmountSlider Component

## Purpose

Specialized slider component for bottle feed amount entry with persistent user settings, hand-mode support, and metric/imperial unit conversion. Part of the feed logging system's mobile-first UX pattern.

## Design Philosophy

Created to match TimeSwiper's interaction model with:
- Settings gear + +/- control buttons
- Persistent user preferences (min/max/increment/drag step/direction)
- Hand-mode aware layout (controls on left for lefties)
- Popover settings panel with IndexedDB persistence

## Key Features

### 1. Hand-Mode Layout Mirroring

```typescript
const controlsOnLeft = handMode === 'left';
```

Controls always follow hand mode to avoid thumb overlap:
- Left-handed: Controls on left, slider on right, amount display right-aligned
- Right-handed: Controls on right, slider on left, amount display left-aligned

### 2. Reversible Slider Direction (Right-Hand Only)

```typescript
const shouldFlipSlider = settings.startOnLeft && handMode === 'right';
```

**Special feature for right-handed users only**: Optional toggle to flip slider direction so min is on right and you drag LEFT to increase amount (natural motion for right-handed users logging with left hand while holding baby).

**Why right-hand only?** Left-handed users already have controls on left, so normal slider direction (min left, max right) is already ergonomic.

### 3. Persistent Settings via IndexedDB

Settings stored at `uiConfig.amountSlider`:

```typescript
type AmountSliderSettings = {
  minAmount: number;          // Default: 0 ml
  defaultAmount: number;      // Default: 120 ml
  maxAmount: number;          // Default: 350 ml
  increment: number;          // +/- button step: 5, 10, or 20 ml
  dragStep: number;           // Slider granularity: 1, 5, or 10 ml
  startOnLeft: boolean;       // Flip direction (right-hand only): default false
};
```

**Wait-for-hydration pattern** (same as TimeSwiper):

```typescript
const isHydrated = useUserStore(s => s.isHydrated);

useEffect(() => {
  if (!isHydrated) return; // Critical: Wait for store hydration
  if (!userId) return;

  async function loadSettings() {
    const config = await getUIConfig(userId!);
    // ... load settings
  }
  loadSettings();
}, [isHydrated, userId]);
```

**Why wait?** Prevents loading from IndexedDB before Zustand store hydrates from sessionStorage, avoiding race conditions.

### 4. Metric/Imperial Conversion

```typescript
const ML_PER_OZ = 29.5735;

const mlToDisplay = (ml: number): number => {
  return !useMetric ? ml / ML_PER_OZ : ml;
};
```

- **Storage**: Always ml in database and component state
- **Display**: Converts to oz when `useMetric: false`
- **Format**:
  - Metric: `120 ml` (integer)
  - Imperial: `4.1 oz` (1 decimal)

### 5. Thicker UI for Mobile Touch

```tsx
<div className="[&_[data-slot='slider-track']]:h-3 [&_[data-slot='slider-thumb']]:size-7">
  <Slider ... />
</div>
```

**Pattern**: Tailwind arbitrary selectors to target Base UI slots without CSS file.

- Track height: 12px (h-3) instead of default 4px
- Thumb size: 28px (size-7) instead of default 20px

**Why**: Larger touch targets for tired parents on mobile.

## Settings Popover Structure

```
Popover
├── Min amount (0-100 ml, step 5)
├── Default amount (50-300 ml, step 10)
├── Max amount (200-500 ml, step 10)
├── +/- button increment (5/10/20 ml radio group)
├── Slider drag step (1/5/10 ml radio group)
├── Flip slider direction (toggle, right-hand only explanation)
└── Save/Cancel buttons
```

**Dirty checking**: Only saves if settings changed (JSON stringify comparison).

**No userId?** Still closes popover, doesn't block interaction (settings just won't persist).

## Props API

```typescript
type AmountSliderProps = {
  value: number;                     // Current amount in ml (always ml)
  onChange: (amountMl: number) => void; // Callback with ml value
  handMode?: 'left' | 'right';      // Layout direction, default 'right'
  className?: string;               // Optional wrapper className
};
```

## Integration Pattern

Used in `AddFeedModal.tsx` for bottle feeds:

```tsx
{method === 'bottle' && (
  <div className="space-y-3">
    <Label className="text-muted-foreground">Amount</Label>
    <AmountSlider
      value={amountMl}
      onChange={setAmountMl}
      handMode={handMode}
    />
  </div>
)}
```

**Pattern**: Label separate from slider (consistent with TimeSwiper).

## State Management

- **Local state**: Transient settings in popover (can cancel)
- **Saved state**: Persisted in IndexedDB via `updateUIConfig`
- **Store state**: Loads from store's `isHydrated` signal

**No prop drilling**: Component loads hand mode from IndexedDB too (same pattern as TimeSwiper).

## Gotchas

- **Settings are per-user, not per-device**: Stored with `userId` key in IndexedDB
- **Flip direction only for right-hand mode**: Toggle is always visible but explanation clarifies
- **Amount always in ml**: Database stores ml, conversion only for display
- **Slider step affects UX**: 1ml step = precise but slow, 10ml step = fast but coarse
- **Default 120ml**: Evidence-based typical bottle feed amount for 0-6 month babies

## Related Components

- `TimeSwiper.tsx` - Shares same architecture (settings popover, hand-mode, IndexedDB persistence)
- `AddFeedModal.tsx` - Parent component that uses AmountSlider
- `Slider.tsx` (Base UI) - Underlying slider primitive
- `lib/local-db/helpers/ui-config.ts` - Persistence layer

## Related Documentation

- `.readme/chunks/local-first.ui-config-storage.md` - UI config persistence system
- `.readme/chunks/local-first.store-hydration-pattern.md` - Wait-for-hydration pattern
- `.readme/chunks/feed-logging.ui-components.md` - Feed logging UI patterns
