---
last_verified_at: 2026-01-20T00:00:00Z
source_paths:
  - src/hooks/useHoldAction.ts
---

# Hold Action Hook Pattern

## Purpose

Reusable React hook for implementing press-and-hold interactions with automatic repeat functionality, supporting both desktop (mouse) and mobile (touch) events.

## Location

**Hook**: `src/hooks/useHoldAction.ts`

## API

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

function useHoldAction(options: UseHoldActionOptions): HoldActionHandlers
```

## Behavior

**Three-phase interaction**:

1. **Immediate action**: Callback executes once on press
2. **Delay phase**: Wait `delayMs` (default 1.5 seconds)
3. **Repeat phase**: Execute callback every `intervalMs` (default 100ms) until release

**Cross-platform**: Works with both mouse and touch events.

## Usage Example

```tsx
import { useHoldAction } from '@/hooks/useHoldAction';

function Counter() {
  const [count, setCount] = useState(0);

  const holdIncrement = useHoldAction({
    onAction: () => setCount(prev => prev + 1),
    intervalMs: 100,   // 10 times per second when holding
    delayMs: 1500,     // Wait 1.5s before repeating
  });

  return (
    <button {...holdIncrement}>
      Hold to increment: {count}
    </button>
  );
}
```

**Key pattern**: Spread handler object onto button element.

## Implementation Details

### Timer Management

**Two timers**:
1. **Delay timeout**: Waits before starting repeat
2. **Interval**: Repeats action at fixed rate

```typescript
const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

**Cleanup**: Both timers are cleared on:
- Mouse up
- Mouse leave (prevents stuck state)
- Touch end
- Component unmount

### Start Hold Sequence

```typescript
const startHold = useCallback(() => {
  // 1. Execute immediately
  onAction();

  // 2. Clear any existing timers
  stopHold();

  // 3. Start delay
  delayTimeoutRef.current = setTimeout(() => {
    // 4. After delay, start interval
    holdIntervalRef.current = setInterval(() => {
      onAction();
    }, intervalMs);
  }, delayMs);
}, [onAction, intervalMs, delayMs, stopHold]);
```

### Stop Hold Sequence

```typescript
const stopHold = useCallback(() => {
  // Clear delay timeout
  if (delayTimeoutRef.current) {
    clearTimeout(delayTimeoutRef.current);
    delayTimeoutRef.current = null;
  }

  // Clear repeat interval
  if (holdIntervalRef.current) {
    clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
  }
}, []);
```

**Idempotent**: Safe to call multiple times (checks for null).

### Event Handler Object

```typescript
return {
  onMouseDown: startHold,
  onMouseUp: stopHold,
  onMouseLeave: stopHold,  // Important: prevents stuck state
  onTouchStart: startHold,
  onTouchEnd: stopHold,
};
```

**Why mouse leave**: If user drags cursor off button while holding, action should stop.

## Configuration Patterns

### Fast Repeat (10 times per second)

```typescript
const handlers = useHoldAction({
  onAction: () => adjustValue(10),
  intervalMs: 100,  // 10 Hz
  delayMs: 1500,
});
```

**Use case**: Timer adjustment, volume control, numeric stepper.

### Slow Repeat (Once per second)

```typescript
const handlers = useHoldAction({
  onAction: () => nextPage(),
  intervalMs: 1000,  // 1 Hz
  delayMs: 2000,     // Wait 2s before repeating
});
```

**Use case**: Pagination, carousel auto-advance.

### Immediate Repeat (No delay)

```typescript
const handlers = useHoldAction({
  onAction: () => scrollDown(),
  intervalMs: 50,   // 20 Hz (very fast)
  delayMs: 0,       // No delay
});
```

**Use case**: Scroll buttons, fast-forward/rewind.

## UX Considerations

### Delay Before Repeat

**Default 1500ms (1.5 seconds)** is a balance:
- **Too short** (< 500ms): Accidental repeats on intentional single taps
- **Too long** (> 2000ms): Feels unresponsive for hold interactions

**Research**: iOS and Android use ~1000-1500ms for long-press actions.

### Repeat Interval

**Default 100ms (10 Hz)** is suitable for most use cases:
- **Too fast** (< 50ms): Difficult to control, values jump too quickly
- **Too slow** (> 200ms): Feels sluggish, requires long holds

**Context-dependent**: Adjust based on action magnitude (e.g., +10 seconds vs. +1 second).

## Cross-Platform Support

### Desktop (Mouse)

```typescript
onMouseDown: startHold,
onMouseUp: stopHold,
onMouseLeave: stopHold,
```

**Mouse leave is critical**: Without it, dragging off button keeps action running.

### Mobile (Touch)

```typescript
onTouchStart: startHold,
onTouchEnd: stopHold,
```

**No touch cancel handler**: Touch interactions don't have equivalent of "mouse leave". If user drags finger off button, `onTouchEnd` fires.

**Future enhancement**: Add `onTouchCancel` handler for edge cases.

## Typical Applications

### 1. Timer Adjustments

```tsx
const holdAdd10 = useHoldAction({
  onAction: () => adjustTimer(timerKey, 10),
  intervalMs: 100,
});

<button {...holdAdd10}>+10s</button>
```

**Pattern**: Each action adjusts by fixed increment (10 seconds).

### 2. Numeric Steppers

```tsx
const holdIncrement = useHoldAction({
  onAction: () => setValue(prev => Math.min(prev + 1, max)),
  intervalMs: 100,
});

<button {...holdIncrement}>+</button>
```

**Pattern**: Clamp to valid range in action callback.

### 3. Volume/Brightness Controls

```tsx
const holdVolumeUp = useHoldAction({
  onAction: () => setVolume(prev => Math.min(prev + 5, 100)),
  intervalMs: 100,
});

<button {...holdVolumeUp}>Volume Up</button>
```

**Pattern**: Percentage-based adjustment with bounds.

### 4. Scroll Buttons

```tsx
const holdScrollDown = useHoldAction({
  onAction: () => window.scrollBy(0, 50),
  intervalMs: 50,  // Faster for smooth scroll
  delayMs: 500,    // Shorter delay for scroll
});

<button {...holdScrollDown}>Scroll Down</button>
```

**Pattern**: Direct DOM manipulation, faster interval for smooth effect.

## Accessibility

### Keyboard Support

**Hook does not handle keyboard events** (only mouse/touch).

**Recommendation**: Add separate keyboard handlers:

```tsx
const handlers = useHoldAction({ onAction });

<button
  {...handlers}
  onKeyDown={(e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      onAction();
    }
  }}
>
  Adjust
</button>
```

**Pattern**: Single action on key press (no auto-repeat for keyboard).

### Screen Readers

**Announce action**: Use `aria-label` to describe hold behavior:

```tsx
<button
  {...handlers}
  aria-label="Increase timer by 10 seconds. Hold to repeat."
>
  +10s
</button>
```

### Haptic Feedback

**Mobile vibration**:

```tsx
const handlers = useHoldAction({
  onAction: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms haptic
    }
    adjustTimer(10);
  },
});
```

**Pattern**: Vibrate on each action for tactile feedback.

## Gotchas

- **Mouse leave required**: Without `onMouseLeave`, dragging off button keeps action running
- **Cleanup on unmount**: `useEffect` cleanup prevents memory leaks
- **Ref stability**: Use `useRef` for timers (not state) to avoid re-renders
- **Callback dependencies**: `startHold` depends on `onAction`, `intervalMs`, `delayMs` (use `useCallback`)
- **No double-tap protection**: Rapid tapping triggers multiple immediate actions (by design)
- **Touch cancel**: Not currently handled (rare edge case)

## Testing

### Unit Test Pattern

```typescript
import { renderHook, act } from '@testing-library/react';
import { useHoldAction } from './useHoldAction';

test('executes action immediately on press', () => {
  const onAction = vi.fn();
  const { result } = renderHook(() => useHoldAction({ onAction }));

  act(() => {
    result.current.onMouseDown();
  });

  expect(onAction).toHaveBeenCalledTimes(1);
});

test('repeats action after delay', async () => {
  vi.useFakeTimers();
  const onAction = vi.fn();
  const { result } = renderHook(() =>
    useHoldAction({ onAction, delayMs: 1000, intervalMs: 100 })
  );

  act(() => {
    result.current.onMouseDown();
  });

  expect(onAction).toHaveBeenCalledTimes(1); // Immediate

  act(() => {
    vi.advanceTimersByTime(1000); // Wait delay
  });

  act(() => {
    vi.advanceTimersByTime(300); // 3 intervals
  });

  expect(onAction).toHaveBeenCalledTimes(4); // 1 immediate + 3 repeats

  vi.useRealTimers();
});
```

## Related

- `chunks/feed-logging.timer-widget.md` - Timer adjustment use case
- `chunks/ui-patterns.button-interactions.md` - Related button patterns (if exists)

## Future Enhancements

### Accelerating Repeat

Increase repeat rate the longer button is held:

```typescript
let currentInterval = intervalMs;

const startRepeat = () => {
  holdIntervalRef.current = setInterval(() => {
    onAction();
    // Accelerate (decrease interval)
    currentInterval = Math.max(50, currentInterval * 0.9);
    clearInterval(holdIntervalRef.current!);
    startRepeat(); // Restart with new interval
  }, currentInterval);
};
```

**Use case**: Scrolling or large value adjustments.

### Progress Callback

Notify caller of hold progress:

```typescript
interface UseHoldActionOptions {
  onAction: () => void;
  onProgress?: (elapsed: number) => void; // Called during delay phase
  // ...
}
```

**Use case**: Show visual progress indicator during delay.

### Configurable Action on Release

Execute different callback on release:

```typescript
interface UseHoldActionOptions {
  onAction: () => void;
  onRelease?: () => void; // Called when hold ends
  // ...
}
```

**Use case**: Commit changes on release, preview during hold.
