---
last_verified_at: 2026-01-29T02:30:00Z
source_paths:
  - src/components/feed/time-swiper/DualTimeSwiper.tsx
  - src/components/feed/time-swiper/components/TimeTabSelector.tsx
  - src/components/feed/time-swiper/components/EditableDurationInput.tsx
  - src/components/feed/time-swiper/hooks/useDurationInput.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/components/BreastInputs.tsx
---

# DualTimeSwiper Component Architecture

## Purpose

Provides unified time range selection (start/end) for timed activities like breast feeding. Combines TimeSwiper with tab-based switching and inline duration editing. This replaces separate start/end time picker patterns, consolidating logic into a single, ergonomic component.

## Key Deviations from Standard

**Before**: Separate TimeSwiper instances for start and end times required context switching and layout duplication.

**Now**: Single DualTimeSwiper component with:
- Tab-based switcher (Start time / End time) with hand-mode-aware alignment
- Inline editable duration display (e.g., "2h 15m") that adjusts start time while keeping end fixed
- Automatic duration validation with error state UI
- Error recovery button (Swap times) for invalid time ranges

## Architecture Overview

```
DualTimeSwiper (Orchestrator)
├── TimeTabSelector (Tab buttons with hand-mode layout)
├── TimeSwiper (Single instance reused for both tabs)
├── EditableDurationInput (Inline duration editor)
└── Error State UI (Invalid duration message + Swap button)

Hooks:
├── useDurationInput (Duration edit mode state and parsing)
```

All components in `src/components/feed/time-swiper/`.

## Component Responsibilities

### DualTimeSwiper (Main Orchestrator)

**File**: `src/components/feed/time-swiper/DualTimeSwiper.tsx`

**Props**:
```typescript
type DualTimeSwiperProps = {
  startTime: Date;
  onStartTimeChange: (date: Date) => void;
  endTime: Date;
  onEndTimeChange: (date: Date) => void;
  handMode?: 'left' | 'right';  // Affects tab alignment and TimeSwiper behavior
  className?: string;
};
```

**Key Responsibilities**:
1. Maintain active tab state (`activeTab: 'start' | 'end'`)
2. Calculate duration in minutes: `Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))`
3. Detect invalid duration: `isInvalidDuration = durationMinutes < 0` (end time before start time)
4. Route time changes to correct callback based on active tab
5. Pass current time value to TimeSwiper based on active tab
6. Manage duration changes that adjust start time (keeping end fixed)
7. Provide swap times button for error recovery

**Critical Logic**:
- **Tab synchronization**: Active tab determines which callback receives TimeSwiper changes
- **Duration adjustment**: Changes end time relative to start, NOT vice versa
  - When user edits duration, the formula is: `newStartTime = endTime - (newMinutes * 60 * 1000)`
  - End time stays fixed; start time moves backward/forward
- **Validation**: Invalid if `durationMinutes < 0` (user set end before start, possibly across midnight)

**Layout**:
```
├─ TimeTabSelector (Start time / End time tabs)
├─ TimeSwiper (reused for both tabs)
├─ Duration Display (always visible)
└─ Error Block (only when invalid)
```

Fixed height container (`min-h-[100px]`) prevents layout shifts when error appears/disappears.

### TimeTabSelector (Hand-Mode Aware)

**File**: `src/components/feed/time-swiper/components/TimeTabSelector.tsx`

**Props**:
```typescript
type TimeTabSelectorProps = {
  activeTab: TimeTab;  // 'start' | 'end'
  onTabChange: (tab: TimeTab) => void;
  handMode?: 'left' | 'right';
  className?: string;
};
```

**Hand Mode Pattern** (Project-Specific):
- **Right-handed mode** (`handMode === 'right'`):
  - Layout: `justify-between`
  - Displays "Time" label on left, tabs on right
  - Tabs stay together on right side of container

- **Left-handed mode** (`handMode === 'left'`):
  - Layout: `justify-start` (no justification change needed, but label is hidden)
  - Tabs naturally left-aligned without "Time" label
  - Better ergonomics for left-handed users reaching mobile screen

**Visual Design**:
- Active tab: Bold text with underline indicator (`h-0.5 bg-primary`)
- Inactive tabs: Lighter gray text with hover effect
- Tab buttons don't wrap; kept in single row

**Why Hand Mode Matters**:
- Mobile apps require ergonomic layout for one-handed use
- Right-handed users prefer controls on right edge of screen
- Left-handed users prefer controls on left edge
- This component demonstrates pattern: pass `handMode` through component tree to adjust layout

### EditableDurationInput (Inline Toggle Edit)

**File**: `src/components/feed/time-swiper/components/EditableDurationInput.tsx`

**Props**:
```typescript
type EditableDurationInputProps = {
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  showDash?: boolean;  // Show "—" instead of formatted duration (when invalid)
  className?: string;
};
```

**Dual Mode Pattern**:
1. **Display mode** (default):
   - Shows formatted duration: `"15m"`, `"2h 15m"`
   - Underline decoration
   - Click to enter edit mode

2. **Edit mode** (when user clicks):
   - Two input fields: hours and minutes
   - Lightweight inputs (transparent background, minimal styling)
   - Auto-focus first non-empty field (hours if >= 60 min, else minutes)
   - Field selection on focus for quick replacement

**Keyboard Navigation**:
- `Enter`: Parse inputs and apply duration
- `Escape`: Cancel edit mode without applying
- Blur (click outside): Apply duration only if clicking outside container, not between fields

**Validation**:
```typescript
const totalMinutes = hours * 60 + minutes;
const clampedMinutes = Math.max(minMinutes, Math.min(maxMinutes, totalMinutes));
```
- Min: 1 minute (no zero durations)
- Max: 24 hours (1440 minutes)
- Invalid input (NaN) silently cancels edit without change

**Formatting**:
- Under 60 minutes: `"15m"`
- 60+ minutes: `"2h 15m"` (always shows both hours and minutes)
- Invalid state: `"—"` dash (when `showDash === true`)

**Critical Detail**: Container ref prevents blur when clicking between hour and minute inputs, allowing seamless field switching.

### useDurationInput Hook

**File**: `src/components/feed/time-swiper/hooks/useDurationInput.ts`

**Purpose**: Encapsulates duration edit mode state and validation logic.

**API**:
```typescript
const {
  isEditing,           // boolean: is user currently editing?
  hoursInput,          // string: typed hours (no validation, can be empty)
  minutesInput,        // string: typed minutes (no validation, can be empty)
  setHoursInput,       // setter
  setMinutesInput,     // setter
  startEditing,        // () => void: enter edit mode, initialize fields from duration
  parseAndApply,       // () => void: validate, clamp, and apply new duration
  cancelEditing,       // () => void: exit edit mode without change
  handleKeyDown,       // (e: KeyboardEvent) => void: Enter/Escape handlers
} = useDurationInput({ durationMinutes, onDurationChange });
```

**Options** (with defaults):
```typescript
type UseDurationInputOptions = {
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  minMinutes?: number;         // Default: 1
  maxMinutes?: number;         // Default: 1440 (24 hours)
};
```

**Key Behaviors**:
1. **startEditing**:
   - Splits current duration into hours/minutes
   - Hours stored as empty string if 0 (user will see placeholder)
   - Minutes always shown as number string

2. **parseAndApply**:
   - Parses hour/minute inputs, defaults to 0 if empty
   - Validates NaN (silently cancels if parsing fails)
   - Clamps to [minMinutes, maxMinutes] range
   - Calls `onDurationChange` with clamped value
   - Exits edit mode

3. **handleKeyDown**:
   - `Enter`: Calls `parseAndApply()` and prevents default form submission
   - `Escape`: Calls `cancelEditing()` (no validation, just exit)
   - All other keys: Fall through to input handler

**Usage Pattern**:
```typescript
// In EditableDurationInput component:
const { isEditing, hoursInput, startEditing, handleKeyDown } = useDurationInput({
  durationMinutes,
  onDurationChange: (minutes) => {
    // This is called when user clicks Apply or presses Enter
    // DualTimeSwiper receives this callback and adjusts startTime
  },
});
```

## Invalid Duration State & Error UI

**Trigger**: When `endTime < startTime` (duration is negative).

**Visual Feedback**:
```
┌─────────────────────────────────────┐
│ End time can't be earlier than      │
│ start time.                         │
│                                     │
│ If this crossed midnight, adjust    │
│ the times so End is after Start.    │
│                                     │
│ [Swap times]  ← recovery button     │
└─────────────────────────────────────┘
```

**Behavior**:
- Duration display shows `"—"` (dash) instead of formatted minutes
- Error block shows recovery message and Swap button
- User can either:
  1. Manually adjust times using tabs and TimeSwiper
  2. Click "Swap times" button to reverse start and end immediately

**Layout Stability**: Min-height container keeps space reserved even when error hidden, preventing layout shift.

## Hand Mode Pattern (Project Specific)

This component exemplifies the hand-mode pattern used throughout the app:

```typescript
// Pattern: Pass handMode through component tree
<DualTimeSwiper handMode={handMode} />
  → <TimeTabSelector handMode={handMode} />
    └─ Adjusts layout based on left/right handed preference
  → <TimeSwiper handMode={handMode} />
    └─ TimeSwiper also respects hand mode
```

**Why This Pattern**:
- Mobile-first app with one-handed usage patterns
- Settings page allows user to set handedness preference
- Every component receiving interaction should respect this setting
- No global state needed; passed explicitly through props

**Implementation in TimeTabSelector**:
```typescript
const isRightHanded = handMode === 'right';

return (
  <div className={cn(
    'flex items-center',
    isRightHanded ? 'justify-between' : 'justify-start',  // ← Hand mode drives layout
  )}>
    {isRightHanded && <span>Time</span>}  // ← Label hidden for left-handed
    <div className="flex items-center gap-4">
      {/* tabs here */}
    </div>
  </div>
);
```

## Integration with BreastInputs

**File**: `src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/components/BreastInputs.tsx`

DualTimeSwiper is used here alongside `EndSideToggle` to capture the full breast feed input:

```typescript
export function BreastInputs({
  startTime, onStartTimeChange,
  endTime, onEndTimeChange,
  endSide, onEndSideChange,
  handMode,
}: BreastInputsProps) {
  return (
    <>
      <DualTimeSwiper
        startTime={startTime}
        onStartTimeChange={onStartTimeChange}
        endTime={endTime}
        onEndTimeChange={onEndTimeChange}
        handMode={handMode}
      />
      <EndSideToggle endSide={endSide} onEndSideChange={onEndSideChange} handMode={handMode} />
    </>
  );
}
```

**Data Flow**:
1. AddFeedModal holds `startTime`, `endTime`, `endSide` state
2. Passes to BreastInputs which uses DualTimeSwiper to modify times
3. When user edits duration or swaps times, callbacks update parent state
4. Duration is calculated and displayed inline

## Common Patterns & Conventions

### Duration Editing Flow

```typescript
// User clicks on duration display
→ EditableDurationInput enters edit mode
→ User types hours and minutes
→ User presses Enter or clicks outside
→ parseAndApply() validates and clamps
→ onDurationChange callback fires
→ DualTimeSwiper recalculates start time (keeping end fixed)
→ Parent AddFeedModal state updates
→ Duration displays new value
```

### Time Tab Switching

```typescript
// User clicks "End time" tab
→ activeTab state changes to 'end'
→ TimeSwiper currentValue = endTime
→ User scrolls TimeSwiper
→ handleTimeChange callback fires with new Date
→ Since activeTab === 'end', calls onEndTimeChange(date)
→ Parent state updates
→ Duration recalculated and displayed
```

### Error Recovery

```typescript
// Invalid duration detected (end before start)
→ Error block appears with "Swap times" button
→ Duration shows "—" (dash)
→ User clicks "Swap times"
→ handleSwapTimes swaps startTime and endTime
→ Duration becomes positive
→ Error block disappears
→ User can now continue
```

## Gotchas

1. **Duration Adjustment Direction**
   - Duration changes only adjust START time, keeping END fixed
   - If you want to adjust END instead, the formula is: `newEndTime = startTime + (newMinutes * 60 * 1000)`
   - Currently designed for end-time-first workflow (user sets end, duration editor adjusts start backward)

2. **Active Tab State Isolation**
   - activeTab state is LOCAL to DualTimeSwiper component
   - Parent component doesn't know which tab is active
   - If parent needs to control tab (e.g., validation on end time → switch to start tab), add prop for this

3. **Invalid Duration vs Zero Duration**
   - Zero duration (start === end) is technically invalid (`durationMinutes = 0`, which is not `< 0`)
   - Currently, zero duration is allowed (no error shown)
   - If zero should be invalid, add check: `isInvalidDuration = durationMinutes <= 0`

4. **Midnight Crossing Edge Case**
   - Error message mentions "If this crossed midnight"
   - Occurs when user sets start at 10 PM and end at 8 AM (different calendar days)
   - JavaScript Date objects handle this correctly; logic works across calendar boundaries
   - Swap button provides quick fix for this scenario

5. **Hand Mode Not Affecting TimeSwiper Dragging**
   - Hand mode affects TimeTabSelector layout and TimeSwiper visual alignment
   - Dragging direction (left/right for time increase/decrease) is NOT affected by hand mode
   - TimeSwiper always uses same drag physics (left = past, right = future)

6. **EditableDurationInput Field Focus**
   - Focus auto-selects all text in the focused field
   - Tab key moves between fields but also applies the input (native browser behavior)
   - Blur on container checks `relatedTarget` to distinguish internal vs external clicks
   - This pattern prevents accidental input loss when switching between fields

7. **Min-Height Container Layout**
   - Error block takes variable height (message + button)
   - Container has `min-h-[100px]` to reserve space even when error hidden
   - If error becomes taller or shorter, update min-height to match

## Related Chunks

- `chunks/feed-logging.timeswiper-date-range.md` - TimeSwiper component used by DualTimeSwiper
- `chunks/feed-logging.ui-components.md` - Activity tile pattern and AddFeedModal context
- `chunks/ui-patterns.activity-modals.md` - Modal structure containing this component
