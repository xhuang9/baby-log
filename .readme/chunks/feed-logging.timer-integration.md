---
last_verified_at: 2026-01-20T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx
---

# Timer Integration in Feed Logging Modal

## Purpose

Documents the dual-mode input system in AddFeedModal: manual time entry vs. timer-based tracking, and how timer state is converted to feed log data.

## Location

**Component**: `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx`

## Dual Input Modes

### Mode Toggle

```typescript
type InputMode = 'timer' | 'manual';

const [inputMode, setInputMode] = useState<InputMode>('manual');
```

**Toggle UI**:
```tsx
<button onClick={() => setInputMode(inputMode === 'manual' ? 'timer' : 'manual')}>
  {inputMode === 'manual' ? 'Use a timer' : 'Manual entry'}
</button>
```

**Default mode**: Manual (familiar pattern for most users).

**Sticky mode**: Input mode resets to 'manual' when modal closes.

## Timer Mode UI

**Conditional rendering**:

```tsx
{inputMode === 'timer' && (
  <div className="space-y-6">
    {/* Timer Widget */}
    <TimerWidget babyId={babyId} logType="feed" />

    {/* Bottle: Amount Slider */}
    {method === 'bottle' && (
      <AmountSlider value={amountMl} onChange={setAmountMl} handMode={handMode} />
    )}

    {/* Breast: End Side Buttons */}
    {method === 'breast' && (
      <div className="flex gap-3">
        <BaseButton variant={endSide === 'left' ? 'primary' : 'secondary'} onClick={() => setEndSide('left')}>
          Left
        </BaseButton>
        <BaseButton variant={endSide === 'right' ? 'primary' : 'secondary'} onClick={() => setEndSide('right')}>
          Right
        </BaseButton>
      </div>
    )}
  </div>
)}
```

**Key difference from manual mode**:
- No time pickers (start/end time)
- Timer widget replaces time input
- Breast feed: No duration display (shown in timer)

## Timer State Subscription

**Subscription pattern**:

```typescript
const timerKey = `feed-${babyId}`;
const timers = useTimerStore(state => state.timers);
const timerState = timers[timerKey];

const {
  getTotalElapsed,
  getActualStartTime,
  hydrate: hydrateTimer,
  isHydrated: isTimerHydrated,
} = useTimerStore();
```

**Hydration check**:

```typescript
useEffect(() => {
  if (user?.localId && !isTimerHydrated) {
    hydrateTimer(user.localId);
  }
}, [user?.localId, isTimerHydrated, hydrateTimer]);
```

**Why**: Ensures timer state is loaded from IndexedDB before modal opens.

## Form Submission: Timer → Feed Log

### Timer Mode Submission

```typescript
const handleSubmit = async () => {
  let durationMinutes: number;
  let feedStartTime: Date;

  if (inputMode === 'timer') {
    // Extract timer data
    const totalElapsedSeconds = getTotalElapsed(timerKey);
    const actualStartTime = getActualStartTime(timerKey);

    if (!actualStartTime || totalElapsedSeconds === 0) {
      setError('Please start the timer before saving');
      return;
    }

    durationMinutes = Math.round(totalElapsedSeconds / 60);
    feedStartTime = actualStartTime;

    // Validate for breast feed
    if (method === 'breast' && durationMinutes <= 0) {
      setError('Please start the timer before saving');
      return;
    }
  } else {
    // Manual mode: use start/end time pickers
    const durationMs = endTime.getTime() - startTime.getTime();
    durationMinutes = Math.round(durationMs / (1000 * 60));
    feedStartTime = startTime;
  }

  // Create feed log
  await createFeedLog({
    babyId,
    method,
    startedAt: feedStartTime,
    ...(method === 'bottle' ? { amountMl } : { durationMinutes, endSide }),
  });
};
```

### Key Transformations

**1. Seconds → Minutes**

```typescript
durationMinutes = Math.round(totalElapsedSeconds / 60);
```

**Why round**: Database stores minutes (integer), not seconds.

**Rounding behavior**:
- 0-29 seconds → 0 minutes (rejected by validation)
- 30-89 seconds → 1 minute
- 90-149 seconds → 2 minutes

**2. Reconstructed Start Time**

```typescript
const actualStartTime = getActualStartTime(timerKey);
// Returns: new Date(Date.now() - (totalElapsed * 1000))
```

**Why reconstruct**: Timer state only stores `lastStartTime` (most recent start) and `elapsedSeconds` (accumulated time). To get the true start time of the entire activity, we work backwards from now.

**Example**:
- User starts timer at 10:00 AM
- User pauses at 10:10 AM (10 minutes)
- User resumes at 10:30 AM
- User saves at 10:35 AM (5 more minutes)
- **Total elapsed**: 15 minutes
- **Actual start time**: 10:20 AM (10:35 AM - 15 minutes)

**This is correct**: Feed started at 10:00 AM with 10-minute break doesn't mean baby was on feed for 35 minutes.

**Edge case**: If you want to track continuous feed time (not wall clock time), use timer without pausing.

## Validation

### Timer-Specific Validations

```typescript
if (!actualStartTime || totalElapsedSeconds === 0) {
  setError('Please start the timer before saving');
  return;
}

if (method === 'breast' && durationMinutes <= 0) {
  setError('Please start the timer before saving');
  return;
}
```

**Why check both conditions**:
- `!actualStartTime`: Timer never started
- `totalElapsedSeconds === 0`: Timer started then immediately paused (edge case)
- `durationMinutes <= 0`: Rounding resulted in 0 minutes (< 30 seconds)

**Bottle feed**: No duration validation (bottle feeds are instant, timer is optional).

## Timer Lifecycle in Modal

### On Modal Open

1. **Timer state hydration** (if not already hydrated)
2. **Timer continues running** (if it was running before)
3. **No automatic reset** (timer persists across modal open/close)

### On Modal Close

1. **Form state resets** (`resetForm()`)
2. **Timer state persists** (user may want to resume later)

### After Successful Save

1. **Form resets** (back to default values)
2. **Timer state persists** (not automatically reset)

**Design decision**: User must manually reset timer if they want to start fresh. This prevents accidental resets.

**Future consideration**: Add "Reset timer after save" checkbox in settings.

## Timer Display in Modal

**Timer is shown instead of**:
- Start time picker (manual mode)
- End time picker (breast feed manual mode)
- Duration display (breast feed manual mode)

**Timer is shown alongside**:
- Feed method toggle (breast/bottle)
- Amount slider (bottle feed)
- End side buttons (breast feed)

**Layout**: Timer widget is the focal point (large, centered).

## Manual Mode Fallback

**Why keep manual mode**:
- **Retroactive logging**: User wants to log a feed that happened earlier
- **Timer not available**: User forgot to start timer during feed
- **Faster input**: For simple feeds, manual entry can be quicker
- **Trust**: Some users prefer manual time entry over timer

**UX principle**: Don't force users into timer-based workflow.

## Interaction Between Modes

### Switching Modes Does Not Affect Timer State

```typescript
// Switching from timer to manual
setInputMode('manual');  // Timer keeps running in background
```

**Timer state is independent**: You can switch modes, adjust manual fields, then switch back to timer.

**Use case**: User starts timer, then realizes they want to backdate the feed. They switch to manual, adjust start time, submit.

### Form Reset Does Not Reset Timer

```typescript
const resetForm = () => {
  setInputMode('manual');
  setMethod('bottle');
  setStartTime(new Date());
  // ... reset other form fields

  // Timer state is NOT reset here
};
```

**Why**: Timer state is global (Zustand + IndexedDB), form state is local (React state).

## Timer Button Visibility

**Timer button always visible** (even in manual mode):

```tsx
<button onClick={() => setInputMode(inputMode === 'manual' ? 'timer' : 'manual')}>
  {inputMode === 'manual' ? 'Use a timer' : 'Manual entry'}
</button>
```

**Position**: Below all input fields, centered.

**Style**: Underlined link (not a primary button), subtle.

## Edge Cases

### Timer Running When Modal Opens

**Behavior**: Modal shows timer in running state.

**UX**: User can immediately see elapsed time, pause, or save.

### Timer at 0 Seconds

**Behavior**: Timer shows 00:00:00, Play button.

**Validation**: Cannot save (error: "Please start the timer before saving").

### Timer Paused Mid-Feed

**Behavior**: Timer shows elapsed time, Play button.

**Saved as**: Total elapsed time (excluding pause duration).

**Example**:
- Feed 10 minutes → Pause → Wait 5 minutes → Resume → Feed 5 more minutes
- Saved duration: 15 minutes (not 20 minutes)

### Timer Reset During Modal Open

**Behavior**: Timer shows 00:00:00.

**Form state**: Unaffected (amount, end side, etc. remain).

**Validation**: Cannot save until timer restarted.

## Future Enhancements

### Auto-Reset Option

**Settings toggle**: "Reset timer after saving feed"

```typescript
const autoResetTimer = useUIConfig(userId, 'autoResetTimer', false);

if (result.success && autoResetTimer) {
  await resetTimer(timerKey);
}
```

### Timer Summary on Save

**Show confirmation modal**:
```
Saved feed:
- Duration: 15 minutes
- Started: 10:20 AM
- Amount: ~18ml (estimated)

Timer has been reset.
```

### Multiple Timer Modes

**Future modes**:
- `'countdown'`: Timer counts down from set duration (e.g., 20 minutes)
- `'interval'`: Alternating timer (e.g., left breast 10 min → right breast 10 min)

## Gotchas

- **Timer persists**: Doesn't reset when modal closes (by design)
- **Mode switching**: Timer keeps running when you switch to manual mode
- **Rounding**: Seconds are rounded to minutes (< 30s → 0 minutes, rejected)
- **Pause duration**: Paused time is excluded from feed duration
- **Actual start time**: Calculated backwards from current time, not from first start
- **No confirmation**: Submitting form with running timer doesn't auto-pause (user must pause or adjust)

## Related

- `chunks/feed-logging.timer-persistence.md` - Timer state management
- `chunks/feed-logging.timer-widget.md` - Timer UI component
- `chunks/feed-logging.ui-components.md` - AddFeedModal overview
- `chunks/local-first.operations-layer.md` - createFeedLog service
