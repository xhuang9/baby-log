---
last_verified_at: 2026-01-29T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/AddFeedModal.tsx
  - src/hooks/useTimerSave.ts
---

# Timer Save Validation and Sub-Minute Rounding

## Purpose

Documents the timer save validation pattern in AddFeedModal and useTimerSave hook, which allows saving breast feed logs with durations less than 60 seconds by rounding up to 1 minute.

## Key Pattern: Sub-Minute Duration Handling

### Problem

Previously, the save button was disabled if timer elapsed was less than 60 seconds:

```typescript
// OLD: Required minimum 60 seconds
const isTimerModeWithNoTime = state.method === 'breast' && state.inputMode === 'timer' && timerElapsed < 60;
```

This forced users to wait for a full minute before being able to save a quick breast feed (e.g., comfort nursing, quick check).

### Solution

Changed validation to allow saving with any elapsed time > 0 seconds, then round up to 1 minute:

```typescript
// NEW: Allow saving with any time > 0 seconds
const isTimerModeWithNoTime = state.method === 'breast' && state.inputMode === 'timer' && timerElapsed < 1;
```

The rounding happens in `useTimerSave.ts` hook using `Math.ceil`:

```typescript
// Use Math.ceil to ensure any elapsed time counts as at least 1 minute
const durationMinutes = Math.ceil(totalElapsedSeconds / 60);
```

### Rounding Behavior

```
0 seconds       → Cannot save (validation rejects < 1 second)
1-60 seconds    → 1 minute (Math.ceil rounds up)
61-120 seconds  → 2 minutes
121-180 seconds → 3 minutes
```

**Example timeline**:
- User starts timer at 10:00 AM
- User stops timer at 10:00:15 (15 seconds elapsed)
- Save validation: 15 seconds > 0 ✓ (button enabled)
- Save confirmation shows: "Save breast feed log with 1 minute?"
- Log is saved with duration = 1 minute

## Validation Locations

### 1. AddFeedModal Save Button Disable Logic

**File**: `src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/AddFeedModal.tsx`

```typescript
// Timer mode validation: Only disable if absolutely no time recorded
const isTimerModeWithNoTime = state.method === 'breast' && state.inputMode === 'timer' && timerElapsed < 1;

// Manual mode validation: Duration must be positive
const breastManualDurationMs = state.endTime.getTime() - state.startTime.getTime();
const breastManualDurationMinutes = Math.round(breastManualDurationMs / (1000 * 60));
const isManualModeInvalidDuration = state.method === 'breast'
  && state.inputMode === 'manual'
  && (breastManualDurationMinutes <= 0);

// Disable if either timer mode or manual mode is invalid
<FormFooter
  disabled={isTimerModeWithNoTime || isManualModeInvalidDuration}
  {...props}
/>
```

**Logic**:
- Timer mode: Check if `timerElapsed < 1` (less than 1 second)
- Manual mode: Check if calculated duration ≤ 0 minutes
- Bottle feeds: No duration validation (instant, timer optional)

### 2. useTimerSave Hook Rounding

**File**: `src/hooks/useTimerSave.ts`

```typescript
const prepareTimerSave = async (): Promise<TimerSaveResult | null> => {
  // Get timer data
  const totalElapsedSeconds = getTotalElapsed(timerKey);
  const actualStartTime = getActualStartTime(timerKey);

  // Guard: Must have start time and some elapsed time
  if (!actualStartTime || totalElapsedSeconds === 0) {
    return null;
  }

  // Use Math.ceil to ensure any elapsed time counts as at least 1 minute
  const durationMinutes = Math.ceil(totalElapsedSeconds / 60);

  // Guard: Duration must be positive (should not happen, but defensive)
  if (durationMinutes <= 0) {
    return null;
  }

  // Show confirmation with rounded duration
  const confirmed = window.confirm(
    `Save ${logType} log with ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}?`,
  );

  if (!confirmed) {
    // Resume timer if user cancels
    if (wasTimerRunning) {
      await resumeTimer(timerKey, babyId, logType);
    }
    return null;
  }

  return {
    confirmed: true,
    durationMinutes,
    startTime: actualStartTime,
  };
};
```

**Rounding logic**:
- Line 63: `Math.ceil(totalElapsedSeconds / 60)` rounds UP any fractional minutes
- Line 72: Confirmation dialog shows rounded duration to user
- User can cancel if they disagree with rounding

## Bottle Feeds vs. Breast Feeds

### Breast Feeds (Duration-Based)

**Timer validation**: Required (must have duration)
```typescript
const isTimerModeWithNoTime = state.method === 'breast' && state.inputMode === 'timer' && timerElapsed < 1;
```

**Manual validation**: Duration must be positive
```typescript
const isManualModeInvalidDuration = state.method === 'breast'
  && state.inputMode === 'manual'
  && (breastManualDurationMinutes <= 0);
```

**Rounding**: Always ceil (sub-minute → 1 minute)

### Bottle Feeds (Amount-Based)

**Timer validation**: NONE (timer optional, amount is primary)
```typescript
// No validation check for bottle + timer mode
```

**Manual validation**: NONE (amount defaults to 0ml, user types in value)

**Rounding**: No rounding (uses exact amount in ml)

## User-Facing Behavior

### Happy Path: Sub-Minute Breast Feed

1. User opens Add Feed Modal
2. Selects Breast → Timer Mode
3. Starts timer, quickly pauses after 25 seconds
4. Save button is ENABLED (not grayed out)
5. Clicks Save
6. Confirmation: "Save breast feed log with 1 minute?"
7. Clicks OK
8. Feed log is saved with duration = 1 minute

### Edge Case: No Time Recorded

1. User opens Add Feed Modal
2. Selects Breast → Timer Mode
3. Timer is at 0 seconds (never started or immediately reset)
4. Save button is DISABLED (grayed out)
5. Must start timer before save is possible

## Database Impact

All feed logs store duration in **minutes** (integer):

```sql
-- Schema example
CREATE TABLE feed_logs (
  duration_minutes INTEGER,  -- Always >= 1 for timer-based feeds
  ...
);
```

This means:
- Timer-based breast feeds: minimum 1 minute (rounded up)
- Manual-based breast feeds: user-specified minutes (can be any positive integer)
- Bottle feeds: no duration stored (volume-based)

## Testing Checklist

- [ ] Start timer with 15 seconds elapsed → Save button enabled
- [ ] Save with 15 seconds → Confirmation shows "1 minute"
- [ ] Confirm → Feed log saved with duration_minutes = 1
- [ ] Cancel confirmation → Timer resumes if it was running
- [ ] Start timer, never stop → Save button enabled
- [ ] Start then immediately reset → Save button disabled
- [ ] Switch to manual mode with 0 duration → Save button disabled

## Gotchas

- **Rounding always UP**: 1-60 seconds ALL become 1 minute (no averaging)
- **Confirmation unavoidable**: User sees rounded value before confirming save
- **Bottle feeds ignore timer duration**: For bottle feeds, timer is just for context; amount in ml is what gets saved
- **Sub-minute feeds only work in timer mode**: Manual mode requires user to specify duration in picker (always integer minutes)

## Related

- `chunks/feed-logging.timer-integration.md` - Full timer integration details
- `chunks/feed-logging.timer-persistence.md` - Timer state management
- `chunks/feed-logging.timer-widget.md` - Timer UI component
- `chunks/feed-logging.ui-components.md` - AddFeedModal overview
