---
last_verified_at: 2026-02-04T15:45:00Z
source_paths:
  - src/components/feed/time-swiper/DualTimeSwiper.tsx
  - src/components/feed/time-swiper/TimeSwiper.tsx
  - src/components/feed/time-swiper/hooks/useTimeSwiperState.ts
  - src/components/feed/time-swiper/hooks/useTimeSwiperAnimation.ts
---

# TimeSwiper State Isolation Pattern (February 2026)

## Background

Previous implementation rendered a single TimeSwiper instance and toggled its value prop between start and end times based on active tab. This caused critical state synchronization bugs:

1. **Swap initialization bug**: After swapping times, switching tabs showed stale state instead of swapped values
2. **Midnight-crossing ghost "In future" indicator**: Switching between start/end tabs could show incorrect future indicators
3. **Shared date picker bug**: DatePicker state wasn't isolated per tab, causing cross-tab value leakage

**Root cause**: TimeSwiper hooks initialized once on mount and persisted stale state across value prop changes.

## Solution: Independent Instances (February 4, 2026)

### Architecture

DualTimeSwiper now renders **two independent TimeSwiper instances** always mounted:

```tsx
export function DualTimeSwiper({
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  handMode = 'right',
  className,
}: DualTimeSwiperProps) {
  const [activeTab, setActiveTab] = useState<TimeTab>('start');

  return (
    <div>
      <TimeTabSelector activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Start tab - always mounted */}
      <div style={{ display: activeTab === 'start' ? undefined : 'none' }}>
        <TimeSwiper
          value={startTime}
          onChange={onStartTimeChange}
          handMode={handMode}
        />
      </div>

      {/* End tab - always mounted */}
      <div style={{ display: activeTab === 'end' ? undefined : 'none' }}>
        <TimeSwiper
          value={endTime}
          onChange={onEndTimeChange}
          handMode={handMode}
        />
      </div>
    </div>
  );
}
```

Each TimeSwiper instance maintains independent:
- Day offset state
- Animation timing
- Date picker state
- Scroll position

### Hook Changes

#### `useTimeSwiperAnimation`

**Change**: dayOffset self-initializes from value's date

```tsx
// OLD: isToday prop determined initial state
const [dayOffset, setDayOffset] = useState(isToday ? 0 : -7);

// NEW: Self-initialize from value date relative to fixedBaseDate
const fixedBaseDate = new Date(fixedBaseDate);
const valueDayOffset = Math.floor(
  (value.getTime() - fixedBaseDate.getTime()) / (24 * 60 * 60 * 1000)
);
const [dayOffset, setDayOffset] = useState(valueDayOffset);

// Also: Added sync effect for external value changes
useEffect(() => {
  setDayOffset(valueDayOffset);
}, [value, fixedBaseDate]);
```

**Impact**: When switching tabs, the new TimeSwiper instance calculates correct dayOffset from its value prop.

#### `useTimeSwiperState`

**Change**: Accept fixedBaseDate as prop; baseDate is now fixed, not state

```tsx
// OLD: baseDate was state, initialized on mount
const [baseDate, setBaseDate] = useState(() => new Date());

// NEW: fixedBaseDate passed as prop (single source of truth)
export function useTimeSwiperState(fixedBaseDate: Date) {
  // baseDate is always fixedBaseDate, no state needed
  // Removed dead handleBackToToday function
}
```

**Impact**: Each TimeSwiper instance receives consistent fixedBaseDate, ensuring deterministic calculations.

#### TimeSwiper Component

**Change**: Pass fixedBaseDate to hooks

```tsx
// Pass fixed base date to both hooks
const { dayOffset, handleDayOffsetChange } = useTimeSwiperState(fixedBaseDate);
const { scrollX, isDragging, ... } = useTimeSwiperAnimation(
  value,
  onChange,
  dayOffset,
  handleDayOffsetChange,
  fixedBaseDate // <- Added
);
```

**Change**: Guard ResizeObserver (browser-only API)

```tsx
// Guard against SSR/test environments
useEffect(() => {
  if (typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(/* ... */);
  return () => observer.disconnect();
}, []);
```

### Testing Impact

Tests updated to be timezone-independent:

```tsx
// OLD: Hardcoded toISOString() comparisons, brittle across timezones
const now = new Date('2026-01-15T10:00:00Z');

// NEW: Use offset-based calculations
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

// Assertions use day offsets, not absolute dates
expect(dayOffset).toBe(1); // Tomorrow
```

## Verification Checklist

- [x] All 15 animation tests passing
- [x] All 13 state hook tests passing
- [x] All 17 integration tests passing
- [x] Tab switching shows correct values (no swap initialization bug)
- [x] Midnight-crossing sessions show correct indicators
- [x] DatePicker state isolated per tab
- [x] ResizeObserver guarded for test environments

## Gotchas

### Migration Path

If adding new features to TimeSwiper:
- Always think in terms of independent instances
- Each instance's state must be deterministic from props
- Avoid shared/singleton state (like old baseDate)

### Duration Display

DualTimeSwiper's duration section:
- Reads from both independent TimeSwiper values
- Duration validation works correctly (startTime < endTime)
- Invalid duration error + swap button still functional

### Hand Mode

HandMode passed to both TimeSwiper instances:
- Each swiper respects hand preference independently
- No cross-tab contamination

## Related Sections

- `.readme/sections/feed-logging.index.md` - Feed logging overview
- `.readme/sections/feed-logging.timeswiper-date-range.md` - Date range constraints
- `.readme/sections/feed-logging.dual-time-swiper.md` - DualTimeSwiper component
