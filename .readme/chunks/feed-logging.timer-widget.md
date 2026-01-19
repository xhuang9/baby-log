---
last_verified_at: 2026-01-20T00:00:00Z
source_paths:
  - src/components/feed/TimerWidget.tsx
  - src/hooks/useHoldAction.ts
---

# Timer Widget Component

## Purpose

Reusable timer widget for tracking activity duration with start/pause/reset controls and hold-to-adjust pattern for fine-tuning time.

## Location

**Component**: `src/components/feed/TimerWidget.tsx`
**Hook**: `src/hooks/useHoldAction.ts`

## Component API

```typescript
type TimerWidgetProps = {
  babyId: number;
  logType: 'feed' | 'sleep' | 'nappy';
  className?: string;
};

<TimerWidget babyId={123} logType="feed" />
```

**Key pattern**: Component automatically derives timer key as `${logType}-${babyId}`.

## Timer Display

### HH:MM:SS Format

```typescript
const formatTimerDisplay = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return {
    hours: hrs.toString().padStart(2, '0'),
    minutes: mins.toString().padStart(2, '0'),
    seconds: secs.toString().padStart(2, '0'),
  };
};
```

**UI Layout**:
```
┌─────────────────────────────────┐
│          00 : 15 : 23           │  ← Large numbers
│         hour minute second      │  ← Small labels
│                                 │
│         ┌──────────┐            │
│         │   Play   │            │  ← Start/Pause button
│         └──────────┘            │
│                                 │
│   Reset   +10s    -10s          │  ← Controls
└─────────────────────────────────┘
```

## Real-Time Updates

**100ms update interval** when timer is running:

```typescript
useEffect(() => {
  if (timerState?.lastStartTime) {
    const interval = setInterval(() => {
      forceUpdate({}); // Trigger re-render
    }, 100);
    return () => clearInterval(interval);
  }
}, [timerState?.lastStartTime]);
```

**Why 100ms**: Smooth seconds counter (10 updates per second) without excessive re-renders.

**Calculation on every render**:

```typescript
const calculateElapsed = (): number => {
  if (!timerState) return 0;

  if (!timerState.lastStartTime) {
    // Paused, use accumulated time
    return timerState.elapsedSeconds;
  }

  // Running, add current session
  const lastStart = new Date(timerState.lastStartTime).getTime();
  const now = Date.now();
  const sessionElapsed = Math.floor((now - lastStart) / 1000);
  return timerState.elapsedSeconds + sessionElapsed;
};
```

**Key insight**: Never store running time in state. Calculate on the fly from `lastStartTime`.

## Zustand Subscription Pattern

**Critical pattern** for reactive updates:

```typescript
// ❌ BAD: Subscribes to specific timer (won't update when timer changes)
const timerState = useTimerStore(state => state.timers[timerKey]);

// ✅ GOOD: Subscribes to entire timers object, extract what you need
const timers = useTimerStore(state => state.timers);
const timerState = timers[timerKey];
```

**Why**: When timer starts/pauses, the `timers` object reference changes, triggering re-render.

## Start/Pause Button

**Single button with dual state**:

```typescript
const handleStartPause = async () => {
  if (timerState?.lastStartTime) {
    // Running → Pause
    await pauseTimer(timerKey);
  } else {
    // Paused or new → Start
    await startTimer(timerKey, babyId, logType);
  }
};
```

**Icon logic**:
- Running (`lastStartTime` is set) → Pause icon
- Paused (`lastStartTime` is null) → Play icon

**Styling**:
- 128px × 128px circular button
- Primary color background
- Icon fill + stroke for better visibility
- Scale animation on press: `active:scale-95`

## Reset Button

**Confirmation dialog** if timer has elapsed time:

```typescript
const handleReset = async () => {
  if (elapsedSeconds > 0) {
    const confirmed = window.confirm('Are you sure you want to reset the timer?');
    if (!confirmed) return;
  }
  await resetTimer(timerKey);
};
```

**Why confirm**: Prevents accidental loss of long-running timers.

**No confirmation** if timer is at 00:00:00 (nothing to lose).

## Adjust Buttons: +10s / -10s

**Hold-to-adjust pattern** using `useHoldAction` hook:

```typescript
const holdAdd10 = useHoldAction({
  onAction: () => handleAdjust(10),
  intervalMs: 100,  // 10 times per second when holding
});

const holdSubtract10 = useHoldAction({
  onAction: () => handleAdjust(-10),
  intervalMs: 100,
});

// Spread handlers onto buttons
<button {...holdAdd10}>+10s</button>
<button {...holdSubtract10}>-10s</button>
```

**Behavior**:
1. **Single tap**: Adjust by 10 seconds once
2. **Hold 1.5s**: Start repeating adjustment 10 times per second
3. **Release**: Stop adjusting

**Lower bound**: Timer cannot go below 0 seconds (handled in store):

```typescript
adjustTimer: async (key, seconds) => {
  const newElapsedSeconds = Math.max(0, currentTimer.elapsedSeconds + seconds);
  // ...
}
```

## useHoldAction Hook

**Location**: `src/hooks/useHoldAction.ts`

**Purpose**: Generic hook for press-and-hold interactions (desktop + mobile).

```typescript
interface UseHoldActionOptions {
  onAction: () => void;     // Callback to execute
  intervalMs?: number;      // Repeat interval (default: 100ms)
  delayMs?: number;         // Delay before repeat starts (default: 1500ms)
}

interface HoldActionHandlers {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}
```

**Implementation**:
1. **Immediate action**: Execute `onAction()` on press
2. **Delay**: Wait `delayMs` (1.5s)
3. **Repeat**: Execute `onAction()` every `intervalMs` (100ms)
4. **Cleanup**: Stop on release or mouse leave

**Usage**:

```tsx
const handlers = useHoldAction({
  onAction: () => setCount(prev => prev + 1),
  intervalMs: 100,
  delayMs: 1500,
});

<button {...handlers}>Hold me</button>
```

**Cross-platform**: Handles both mouse (desktop) and touch (mobile) events.

## Performance Considerations

### Throttling Updates

**100ms interval** is a balance:
- **Too fast** (e.g., 10ms): Excessive re-renders, CPU usage
- **Too slow** (e.g., 1000ms): Seconds counter appears to jump

**Why not 1000ms**: Users expect smooth seconds ticking, especially for short timers.

### Memoization Not Needed

**Current approach**: Recalculate elapsed time on every render during updates.

**Why it's fine**:
- Calculation is O(1) math (no loops, no API calls)
- Only runs during timer updates (not when timer is paused)
- Component is small, no expensive child components

## Styling

**CSS Variables** for theming:

```css
/* Timer display */
text-5xl font-light tracking-wider text-foreground

/* Fixed width for consistent alignment */
style={{ width: '62.5px' }}  /* Prevents layout shift */

/* Start/Pause button */
bg-primary text-primary-foreground
h-32 w-32 rounded-full

/* Control buttons */
bg-muted text-foreground
rounded-md px-3 py-1 text-sm
```

**Brand consistency**: Uses CSS variables, works in both light and dark mode.

## Future Enhancements

### Lap Times

Add lap tracking for interval timers (e.g., alternating breasts):

```typescript
type TimerState = {
  // ... existing fields
  laps?: Array<{ elapsed: number; timestamp: string }>;
};
```

**UI**: "Lap" button between +10s and -10s.

### Visual Progress Ring

Circular progress indicator around start/pause button:

```tsx
<svg className="absolute inset-0">
  <circle
    cx="64" cy="64" r="60"
    stroke="currentColor"
    strokeDasharray={circumference}
    strokeDashoffset={circumference * (1 - progress)}
  />
</svg>
```

**Use case**: Visual feedback for timed goals (e.g., "20 minutes per breast").

### Vibration Feedback

On mobile, vibrate when holding adjust buttons:

```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(10); // 10ms haptic
}
```

## Gotchas

- **Subscription pattern**: Must subscribe to entire `timers` object, not individual timer
- **No upper bound**: Timer can run indefinitely (no 99:59:59 cap)
- **Fixed width numbers**: Prevents layout shift when digits change (e.g., 9 → 10)
- **Mouse leave**: Holding stops when cursor leaves button (prevents stuck state)
- **Paused calculation**: When paused, `lastStartTime` is null (not "0" or empty string)

## Related

- `chunks/feed-logging.timer-persistence.md` - Timer state management
- `chunks/feed-logging.timer-integration.md` - Integration with feed modal
- `chunks/local-first.ui-config-storage.md` - Persistence system
