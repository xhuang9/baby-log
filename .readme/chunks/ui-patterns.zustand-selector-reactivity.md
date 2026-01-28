---
last_verified_at: 2026-01-29T00:00:00Z
source_paths:
  - src/stores/useTimerStore.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/AddFeedModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/hooks/useFeedFormSubmit.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-sleep-modal/hooks/useSleepFormSubmit.ts
---

# Zustand Selector Reactivity Pattern for Modal State

## Purpose

Document the pattern for reactive component state updates via Zustand selectors, particularly for modal validation that depends on store state (e.g., timer state in feed/sleep modals).

## Why This Pattern Exists

**Issue:** Modal validation logic needs to react when timer state changes (e.g., user presses +1m button), but timer state lives in Zustand store.

**Naive Approach (Broken):**
```typescript
// useFeedFormSubmit.ts
const handleSubmit = async () => {
  const timer = useTimerStore.getState(); // Current state at call time
  const durationSeconds = timer.getTotalElapsed(); // Call function

  if (durationSeconds < 60) {
    setError('Please record at least 60 seconds');
    return;
  }
  // ... submit
};

// Problem: Save button only checks timer when clicked, not when timer changes
// User presses +1m button → timer updates → but button still shows "disabled"
// until component re-renders
```

**Solution:** Use Zustand selectors with direct subscription to store updates:

```typescript
// useFeedFormSubmit.ts
import { useTimerStore } from '@/stores/useTimerStore';

export function useFeedFormSubmit(options) {
  const [canSave, setCanSave] = useState(false);

  // Subscribe to timer changes via selector
  useEffect(() => {
    const unsubscribe = useTimerStore.subscribe(
      state => state.totalElapsedSeconds, // Selector: extract value
      totalElapsedSeconds => {
        // Callback: runs whenever totalElapsedSeconds changes
        setCanSave(totalElapsedSeconds >= 60);
      }
    );

    return unsubscribe;
  }, []);

  // ... rest of submit logic
}
```

**Benefits:**
- Save button updates instantly when user adjusts timer
- No manual polling or effect dependencies
- Clean, declarative reactivity
- Works with React Hook Form, Zustand, etc.

## Implementation Pattern

### 1. Zustand Store with Subscriptions

**File:** `src/stores/useTimerStore.ts`

```typescript
import { create } from 'zustand';

interface TimerState {
  babyId: number | null;
  totalElapsedSeconds: number;
  isRunning: boolean;
  // ... other fields

  start: () => void;
  pause: () => void;
  addMinutes: (minutes: number) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  babyId: null,
  totalElapsedSeconds: 0,
  isRunning: false,

  start: () => set({ isRunning: true }),
  pause: () => set({ isRunning: false }),

  addMinutes: (minutes: number) => {
    set(state => ({
      totalElapsedSeconds: state.totalElapsedSeconds + minutes * 60,
    }));
  },

  reset: () => set({ totalElapsedSeconds: 0, isRunning: false }),
}));

// Selector: Extract total elapsed (for subscriptions)
export const selectTimerElapsed = (state: TimerState) => state.totalElapsedSeconds;
```

### 2. Hook with Reactive Validation

**File:** `src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/hooks/useFeedFormSubmit.ts`

```typescript
import { useEffect, useState } from 'react';
import { useTimerStore, selectTimerElapsed } from '@/stores/useTimerStore';

export function useFeedFormSubmit(options: UseFeedFormSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);

  // 1. Subscribe to timer changes
  useEffect(() => {
    if (options.inputMode !== 'timer') {
      setCanSave(true); // Manual mode always allows save
      return;
    }

    // Subscribe to timer elapsed selector
    const unsubscribe = useTimerStore.subscribe(
      selectTimerElapsed, // Selector to extract value
      totalElapsedSeconds => {
        // Callback: runs whenever selector value changes
        const canSubmit = totalElapsedSeconds >= 60;
        setCanSave(canSubmit);
      }
    );

    // Check initial state
    const initialElapsed = useTimerStore.getState().totalElapsedSeconds;
    setCanSave(initialElapsed >= 60);

    return unsubscribe;
  }, [options.inputMode]);

  // 2. Submit logic
  const handleSubmit = async () => {
    if (options.inputMode === 'timer') {
      const totalElapsed = useTimerStore.getState().totalElapsedSeconds;

      if (totalElapsed < 60) {
        setError('Please record a timer first');
        return;
      }

      // ... proceed with submission
    } else {
      // Manual mode validation
      const duration = calculateDuration(options.startTime, options.endTime);

      if (duration <= 0) {
        setError('End time must be after start time');
        return;
      }
    }

    // ... rest of submission
  };

  return { handleSubmit, isSubmitting, error, canSave };
}
```

### 3. Component Using Reactive State

**File:** `src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/AddFeedModal.tsx`

```typescript
export function AddFeedModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddFeedModalProps) {
  const { state, actions } = useFeedFormState();
  const { handleSubmit, isSubmitting, error, canSave } = useFeedFormSubmit({
    babyId,
    inputMode: state.inputMode,
    startTime: state.startTime,
    endTime: state.endTime,
    // ... other options
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        {/* ... UI sections */}

        {/* Save button reactively disabled based on timer state */}
        <Button
          onClick={handleSubmit}
          disabled={!canSave || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
```

**Result:** When user presses +1m button (while modal is open):
1. Timer state updates: `totalElapsedSeconds += 60`
2. Zustand notifies subscribers of selector change
3. `setCanSave(true)` runs
4. Button re-renders: `:disabled` attribute removed
5. User can immediately click Save

## Key Patterns

### 1. Selector Function

Always extract a specific piece of state:

```typescript
// GOOD - selector extracts specific value
const selectTimerElapsed = (state: TimerState) => state.totalElapsedSeconds;

// Avoid - entire state object
const selectEntireState = (state: TimerState) => state;
```

**Why:** Zustand optimizes: only re-run callback if selector value changed. Returning entire object means every store update triggers callback.

### 2. Subscription Cleanup

Always unsubscribe on unmount:

```typescript
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe(
    state => state.someValue,
    value => { /* handle change */ }
  );

  return unsubscribe; // Called on unmount
}, []);
```

**Why:** Prevents memory leaks and stale closures if component unmounts before store updates.

### 3. Initial State Check

Check initial state after setting up subscription:

```typescript
useEffect(() => {
  // 1. Subscribe to future changes
  const unsubscribe = useTimerStore.subscribe(
    selectTimerElapsed,
    value => setCanSave(value >= 60)
  );

  // 2. Check current value
  const initial = useTimerStore.getState().totalElapsedSeconds;
  setCanSave(initial >= 60);

  return unsubscribe;
}, []);
```

**Why:** If subscription triggers before state is set, component won't show stale value. Ensures immediate correctness.

### 4. Dependency Array Stability

Keep dependencies minimal and stable:

```typescript
// In feed modal: only react to input mode changes
useEffect(() => {
  // ... setup subscription
}, [options.inputMode]); // Minimal, stable

// NOT: [options, babyId, ...] (unnecessary re-setups)
```

**Why:** Unnecessary dependencies cause re-subscription and potential memory leaks.

## Comparison: Before vs After

### Before (Stale Button State)

```typescript
export function useFeedFormSubmit(options: UseFeedFormSubmitOptions) {
  const [canSave, setCanSave] = useState(true); // Assume always saveable

  const handleSubmit = async () => {
    const elapsed = useTimerStore.getState().totalElapsedSeconds;

    // Check only at submit time
    if (options.inputMode === 'timer' && elapsed < 60) {
      setError('Please record a timer first');
      return;
    }

    // ... submit
  };

  return { handleSubmit, isSubmitting, error, canSave };
}

// Result in component:
// [User in timer mode, timer at 30s, Save button ENABLED]
// [User presses +30s button, timer at 60s, Save button STILL ENABLED visually]
// [User clicks Save, validation passes, but UX is confusing]
```

### After (Reactive Button State)

```typescript
export function useFeedFormSubmit(options: UseFeedFormSubmitOptions) {
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    if (options.inputMode !== 'timer') {
      setCanSave(true);
      return;
    }

    // Subscribe to timer changes
    const unsubscribe = useTimerStore.subscribe(
      selectTimerElapsed,
      elapsed => setCanSave(elapsed >= 60)
    );

    // Check initial state
    setCanSave(useTimerStore.getState().totalElapsedSeconds >= 60);

    return unsubscribe;
  }, [options.inputMode]);

  const handleSubmit = async () => {
    // ... submit (validation already passed via canSave)
  };

  return { handleSubmit, isSubmitting, error, canSave };
}

// Result in component:
// [User in timer mode, timer at 30s, Save button DISABLED]
// [User presses +30s button, timer at 60s, Save button INSTANTLY ENABLED]
// [User can immediately click Save, validation passes, UX is clear]
```

## Gotchas / Constraints

### 1. Selector Mismatch with Store Definition

**Issue:** If selector returns object or array, Zustand uses shallow equality check:

```typescript
// WRONG: returns new object every time
const selector = (state) => ({ value: state.totalElapsed });

// Zustand checks: { value: 60 } === { value: 60 } → false (different objects)
// Callback runs every store update, even if value didn't change
```

**Solution:** Extract primitive values or use shallow comparison:

```typescript
// CORRECT: returns primitive
const selector = (state) => state.totalElapsed;
```

### 2. Multiple Subscriptions

**Issue:** If same component subscribes to multiple values, creates multiple listeners:

```typescript
// Two separate subscriptions
useEffect(() => {
  const unsub1 = useTimerStore.subscribe(
    state => state.totalElapsedSeconds,
    elapsed => { /* ... */ }
  );
  // ...
}, []);

useEffect(() => {
  const unsub2 = useTimerStore.subscribe(
    state => state.isRunning,
    isRunning => { /* ... */ }
  );
  // ...
}, []);
```

**Mitigation:** Group related subscriptions if many:

```typescript
// Consider moving to custom hook if 3+ subscriptions
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe(
    state => ({
      totalElapsed: state.totalElapsedSeconds,
      isRunning: state.isRunning,
    }),
    ({ totalElapsed, isRunning }) => {
      setCanSave(totalElapsed >= 60);
      setIsRunning(isRunning);
    }
  );

  return unsubscribe;
}, []);
```

### 3. Reactive Effects May Re-Run Unexpectedly

**Issue:** If selector captures stale props, effect re-runs unnecessarily:

```typescript
// BAD: effect re-runs on every render
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe(
    state => state.totalElapsedSeconds,
    elapsed => setCanSave(elapsed >= options.minimumSeconds) // options captured
  );
  return unsubscribe;
}, [options]); // Re-setup whenever options changes
```

**Solution:** Use closure or pass via ref:

```typescript
// GOOD: effect only re-runs when inputMode changes
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe(
    state => state.totalElapsedSeconds,
    elapsed => setCanSave(elapsed >= 60) // Hardcoded or stable
  );
  return unsubscribe;
}, [options.inputMode]); // Only specific dependency
```

## Related Systems

- `.readme/chunks/feed-logging.timer-widget.md` - Timer UI and state management
- `.readme/chunks/ui-patterns.activity-modals.md` - Modal architecture and hook responsibilities
- `.readme/chunks/feed-logging.timer-integration.md` - Timer/manual mode switching
