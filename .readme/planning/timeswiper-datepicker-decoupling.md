# TimeSwiper + DatePicker Decoupling Plan

## Problem with Current Approach

The fixed-epoch implementation attempted to make offset↔date conversion deterministic, but:
1. Still has buggy/weird interactions
2. Over-complicated the swiper trying to handle infinite date range
3. The date calculation logic is tangled with swiper positioning

## New Architecture: Decoupled Time + Date

### Core Concept

**TimeSwiper**: Only handles TIME within a bounded range relative to "now"
**DatePicker**: Separately sets the BASE DATE (independent of swiper)
**Final Value**: `DatePicker.date + TimeSwiper.timeOffset = DateTime`

### TimeSwiper Behavior

1. **Range when "today" selected**: -7 days to +1 day
   - User can't log far in the future (time wall at tomorrow)

2. **Range when past date selected**: -7 days to +7 days
   - Centered around selected date
   - When reset, swiper shows current time but allows ±7 day swipe

3. **Boundary behavior**:
   - At edges (past 12:00 AM on boundary days), show message: "Change date to continue"
   - Don't render empty area beyond boundaries

4. **When DatePicker changes**:
   - Reset swiper to CENTER position
   - Keep the TIME value (e.g., 7:00 AM stays 7:00 AM)
   - Just change what ±7 days means

### DatePicker Behavior

1. **Appears when**: User swipes past "today" boundary
2. **Position**: Top-left dropdown (existing UI)
3. **Two states**:
   - `displayDate`: What picker shows when opened (calculated value)
   - `baseDate`: The actual stored base date for submission

4. **Open picker**: Shows `displayDate` (baseDate + swiper offset)
5. **Cancel**: No change to `baseDate`
6. **Save**: Sets `baseDate` to selected date, resets swiper to center

### Date Indicator Text

The underlined date text should show the **combined value**:
- `baseDate` + `swiperDayOffset` = `displayDate`

Example:
- User selects Nov 25, 2025 in picker
- User swipes -3 days on swiper
- Text shows: "22 Nov 2025"
- Opening picker shows: Nov 22, 2025
- On save, this becomes the new base date

### State Model

```typescript
// In parent component (FeedLogEntry or similar)
const [baseDate, setBaseDate] = useState<Date>(new Date()); // Actual base date
const [swiperTime, setSwiperTime] = useState<Date>(new Date()); // Time from swiper

// Calculated display date
const displayDate = useMemo(() => {
  // Combine baseDate's date with swiperTime's time
  // Account for day offset from swiper
  const dayOffset = calculateDayOffset(swiperTime, new Date());
  const result = new Date(baseDate);
  result.setDate(result.getDate() + dayOffset);
  result.setHours(swiperTime.getHours(), swiperTime.getMinutes(), 0, 0);
  return result;
}, [baseDate, swiperTime]);

// This is what gets submitted
const finalDateTime = displayDate;
```

### TimeSwiper Props (Simplified)

```typescript
type TimeSwiperProps = {
  value: Date;           // Current time value
  onChange: (date: Date) => void;  // Time changed
  isToday: boolean;      // Affects range (-7/+1 vs -7/+7)
  onBoundaryReached?: (direction: 'past' | 'future') => void;
  className?: string;
};
```

---

## Implementation Steps

### Step 1: Revert to Working TimeSwiper

- Discard current staged changes OR
- Revert to last known good state
- Test that basic swipe works smoothly

### Step 2: Simplify TimeSwiper

- Remove all date calculation from TimeSwiper
- TimeSwiper only reports TIME changes
- Add `isToday` prop for range control
- Add boundary callbacks

### Step 3: Create DatePicker Integration

- Move DatePicker to parent component
- Implement two-state date model (baseDate + displayDate)
- Wire up picker open/save/cancel logic

### Step 4: Update Date Indicator

- Date text shows calculated `displayDate`
- Clicking opens picker with `displayDate` pre-selected

### Step 5: Wire Up Submission

- Combine `baseDate` + `swiperDayOffset` + `swiperTime`
- Submit final DateTime

---

## Files to Modify

| File | Action |
|------|--------|
| `TimeSwiper/` | Revert, then simplify to time-only |
| `FeedLogEntry.tsx` or parent | Add baseDate state, DatePicker integration |
| `DatePickerTrigger.tsx` | Update to work with two-state model |

---

## Revert Command

```bash
# Option 1: Discard all TimeSwiper changes
git checkout -- src/components/feed/TimeSwiper/

# Option 2: If useTimelineRange.ts was deleted, restore it
git checkout HEAD -- src/components/feed/TimeSwiper/hooks/useTimelineRange.ts

# Option 3: Stash changes for reference
git stash push -m "epoch-based-timeswiper" -- src/components/feed/TimeSwiper/
```

---

## Testing Checklist

1. [ ] Smooth swipe behavior (no jumps)
2. [ ] Day indicator updates correctly when swiping past midnight
3. [ ] DatePicker shows correct combined date
4. [ ] DatePicker save resets swiper to center
5. [ ] Boundary message appears at edges
6. [ ] Final submission value is correct
7. [ ] Works for today and past dates
