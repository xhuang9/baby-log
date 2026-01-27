---
last_verified_at: 2026-01-27T00:00:00Z
source_paths:
  - src/components/feed/TimeSwiper.tsx
---

# TimeSwiper Date Range Constraint

## Purpose

Restricts the scrollable date range in the TimeSwiper component from -7 days to +1 day 23:59 (not +2 days). This prevents users from logging baby activities too far into the future, keeping the log focused on past and immediate next-day activities.

## Key Deviations from Standard

The TimeSwiper previously allowed infinite horizontal scrolling wrapping around (circular timeline). The new implementation uses hard boundaries:

- **Old behavior**: Single 24-hour timeline that wraps infinitely (modulo arithmetic)
- **New behavior**: Fixed 9-day linear timeline: 7 days before current time through end of next day (23:59)
- Prevents users from scheduling activities beyond tomorrow
- Includes visual day offset indicator when viewing past/future days

## Implementation

### Timeline Constants

Located at top of `src/components/feed/TimeSwiper.tsx`:

```typescript
// Timeline constants
const HOUR_WIDTH = 100; // pixels per hour
const HOURS_PER_DAY = 24;
const DAY_WIDTH = HOUR_WIDTH * HOURS_PER_DAY; // 2400px per day

// Physics constants
const MAX_ANIMATION_DURATION = 3000; // 3 seconds max

// Day boundaries - render -7 days to +1 day 23:59 from current time
const MAX_DAYS_BEFORE = 7;
const MAX_DAYS_AFTER = 1;
const TOTAL_DAYS = MAX_DAYS_BEFORE + 1 + MAX_DAYS_AFTER; // 9 days
const TOTAL_WIDTH = DAY_WIDTH * TOTAL_DAYS - (HOUR_WIDTH / 60); // 21598.33px (ends at 23:59 of +1 day)
```

**Critical calculation**: `TOTAL_WIDTH = DAY_WIDTH * TOTAL_DAYS - (HOUR_WIDTH / 60)`
- `DAY_WIDTH * TOTAL_DAYS = 2400 * 9 = 21600px` (exactly 9 days)
- Subtract `HOUR_WIDTH / 60 = 100/60 = 1.67px` to end at exactly 23:59 instead of 24:00 (which would be start of +2 days)
- Result: `21598.33px` ending precisely at tomorrow's 23:59:00

### Timeline Start Calculation

```typescript
// Get the timeline start date (7 days before current time, at midnight)
const getTimelineStart = useCallback((referenceTime: Date): Date => {
  const start = new Date(referenceTime);
  start.setDate(start.getDate() - MAX_DAYS_BEFORE);
  start.setHours(0, 0, 0, 0);
  return start;
}, []);
```

Always 7 days before the reference time (now), at midnight. All pixel offsets calculated relative to this point.

### Pixel Offset Conversion

**Date to pixel offset**:
```typescript
const dateToOffset = useCallback((date: Date, referenceTime: Date): number => {
  const timelineStart = getTimelineStart(referenceTime);
  const diffMs = date.getTime() - timelineStart.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return (diffMinutes / 60) * HOUR_WIDTH;
}, [getTimelineStart]);
```

**Pixel offset to date**:
```typescript
const offsetToDate = useCallback((pixelOffset: number, referenceTime: Date): Date => {
  const timelineStart = getTimelineStart(referenceTime);
  const totalMinutes = (pixelOffset / HOUR_WIDTH) * 60;
  const newDate = new Date(timelineStart.getTime() + totalMinutes * 60 * 1000);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
}, [getTimelineStart]);
```

Both require `referenceTime` parameter (not just the `value`) to maintain correct alignment as time passes.

### Boundary Clamping

Both during dragging and momentum animation, offsets are clamped to hard boundaries:

```typescript
// Clamp to timeline boundaries
const minOffset = 0;
const maxOffset = TOTAL_WIDTH;

if (offsetRef.current < minOffset) {
  offsetRef.current = minOffset;
  velocityRef.current = 0;
} else if (offsetRef.current > maxOffset) {
  offsetRef.current = maxOffset;
  velocityRef.current = 0;
}
```

**Removed**: Previous modulo wrapping (`((offset % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH`) that created infinite scroll behavior.

### Day Offset Display

Displays relative day indicator (e.g., "-3day", "+1day") in the UI:

```typescript
const calculateDayOffset = (): number => {
  const selectedDate = new Date(value);
  selectedDate.setHours(0, 0, 0, 0);
  const currentDate = new Date(currentTime);
  currentDate.setHours(0, 0, 0, 0);
  const diffMs = selectedDate.getTime() - currentDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const formatDayOffset = (): string => {
  if (dayOffset === 0) {
    return '';
  }
  return dayOffset > 0 ? `+${dayOffset}day` : `${dayOffset}day`;
};
```

Shown above the time display when viewing past/future days.

### Reset to Now Button

A "Now" button appears in top-right when user scrolls to any day other than today:

```typescript
const showReset = dayOffset !== 0;

const resetToNow = useCallback(() => {
  stopAnimation();
  const now = new Date();
  onChange(now);

  // Reset refs
  const newOffset = dateToOffset(now, currentTime);
  offsetRef.current = newOffset;
  setOffset(newOffset);
}, [onChange, stopAnimation, dateToOffset, currentTime]);
```

## Tick Marks Generation

Timeline now generates tick marks for entire 9-day range:

```typescript
const timelineStart = getTimelineStart(currentTime);
const ticks: Array<{ position: number; isHour: boolean; label: string; date: Date }> = [];

for (let day = 0; day < TOTAL_DAYS; day++) {
  for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
    const tickDate = new Date(timelineStart);
    tickDate.setDate(tickDate.getDate() + day);
    tickDate.setHours(hour, 0, 0, 0);

    const position = (day * HOURS_PER_DAY + hour) * HOUR_WIDTH;

    ticks.push({
      position,
      isHour: true,
      label: formatHourLabel(tickDate),
      date: tickDate,
    });

    // Half-hour mark
    ticks.push({
      position: position + HOUR_WIDTH / 2,
      isHour: false,
      label: '',
      date: tickDate,
    });
  }
}
```

Previously: only 24-hour ticks with hour-based labels
Now: 216 ticks total (24 hours/day × 9 days × 2 half-hour marks), with date-aware labels

## Gotchas

1. **Reference Time Parameter is Critical**
   - All offset conversions require a `referenceTime` parameter
   - Must be current time to maintain correct alignment as time passes
   - Using `value` instead of `currentTime` causes drift when swiping over midnight

2. **End of Day Edge Case**
   - Timeline ends at exactly 23:59 (86399 seconds), not 24:00
   - `TOTAL_WIDTH` includes fractional pixel subtraction to achieve this
   - Off-by-one errors in TOTAL_DAYS calculation would allow +2 days

3. **Momentum Animation with Hard Boundaries**
   - When user flings past boundary, animation stops immediately
   - Velocity is zeroed when boundary is hit
   - Users cannot "overshoot" and bounce back (different from elastic scrolling)

4. **Settings Hydration Timing**
   - Timeline initialization depends on `currentTime` being set
   - `getTimelineStart` called in tick generation, depends on hydrated `currentTime`
   - Changes to `currentTime` trigger full re-render of 216 ticks

5. **Day Offset Reset Button**
   - Stored as `dayOffset` in state, recalculated on every render
   - Only shows when `dayOffset !== 0`
   - Clicking "Now" resets both the date value and all animation refs

## Related Chunks

- `chunks/feed-logging.timer-widget.md` - Timer display above TimeSwiper
- `chunks/feed-logging.timer-integration.md` - Integration with AddFeedModal
- `chunks/ui-patterns.activity-modals.md` - Modal pattern containing TimeSwiper
