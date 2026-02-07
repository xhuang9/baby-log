---
last_verified_at: 2026-02-07T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/hooks/useFeedFormSubmit.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/AddFeedModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/hooks/useSolidsFormSubmit.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/AddSolidsModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/hooks/useGrowthFormSubmit.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/AddGrowthModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-medication-modal/hooks/useMedicationFormSubmit.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-medication-modal/AddMedicationModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/hooks/usePumpingFormSubmit.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/AddPumpingModal.tsx
---

# Modal Validation Pattern

## Purpose

Establishes a consistent validation pattern across all activity modals where submit hooks compute and expose `isValid` state, and orchestrator components simply pass `disabled={!isValid}` to FormFooter. This centralizes validation logic and keeps orchestrators thin.

## Why This Pattern Exists

Before this pattern (January 2026):
- Orchestrators contained inline validation logic
- Validation was duplicated between button disable state and submit handlers
- Hard to test validation in isolation
- Inconsistent validation approaches across modals

After this pattern:
- **Submit hooks own validation**: Compute `isValid` based on form state
- **Orchestrators stay thin**: Just destructure `isValid` and pass to FormFooter
- **Single source of truth**: Validation logic lives in one place (submit hook)
- **Testable**: Validation can be unit tested separately from UI

## Architecture

### 1. Submit Hook Computes `isValid`

Every submit hook (`use{Activity}FormSubmit`) now:
1. Computes validation state based on props
2. Returns `isValid` boolean alongside `handleSubmit`, `isSubmitting`, `error`
3. Validation logic lives entirely in the hook (not in orchestrator)

### 2. Orchestrator Passes to FormFooter

Every orchestrator (`Add{Activity}Modal`) now:
1. Destructures `isValid` from submit hook
2. Passes `disabled={!isValid}` to FormFooter
3. Contains NO inline validation logic

## Implementation Examples

### Feed Modal Validation

**Submit hook** (`useFeedFormSubmit.ts`):
```typescript
export function useFeedFormSubmit({
  method,
  inputMode,
  timerElapsed,
  startTime,
  endTime,
  // ... other props
}: UseFeedFormSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation logic
  const isTimerModeWithNoTime =
    method === 'breast' && inputMode === 'timer' && timerElapsed < 1;
  const manualDurationMs = endTime.getTime() - startTime.getTime();
  const isManualModeInvalidDuration =
    method === 'breast' && inputMode === 'manual' && Math.round(manualDurationMs / 60000) <= 0;
  const isValid = !isTimerModeWithNoTime && !isManualModeInvalidDuration;

  const handleSubmit = async () => {
    // ... submission logic
  };

  return { handleSubmit, isSubmitting, error, isValid };
}
```

**Orchestrator** (`AddFeedModal.tsx`):
```typescript
export function AddFeedModal({ babyId, open, onOpenChange, onSuccess }: Props) {
  const { state, actions } = useFeedFormState();
  const { handleSubmit, isSubmitting, error, isValid } = useFeedFormSubmit({
    babyId,
    method: state.method,
    inputMode: state.inputMode,
    timerElapsed, // Reactive timer state
    startTime: state.startTime,
    endTime: state.endTime,
    // ... other props
  });

  return (
    <Sheet>
      {/* ... modal content ... */}
      <FormFooter
        onPrimary={handleSubmit}
        primaryLabel="Save"
        onSecondary={handleClose}
        secondaryLabel="Cancel"
        isLoading={isSubmitting}
        disabled={!isValid}  // ← Single validation point
        handMode={state.handMode}
      />
    </Sheet>
  );
}
```

### Solids Modal Validation

**Submit hook**:
```typescript
export function useSolidsFormSubmit({
  selectedFoodIds,
  foodInput,
  // ... other props
}: UseSolidsFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: Must have selected foods OR typed input
  const isValid = selectedFoodIds.length > 0 || foodInput.trim().length > 0;

  const handleSubmit = async () => {
    // ... submission logic
  };

  return { handleSubmit, isSubmitting, error, isValid };
}
```

**Orchestrator**:
```typescript
export function AddSolidsModal({ babyId, open, onOpenChange, onSuccess }: Props) {
  const { state, actions } = useSolidsFormState();
  const { handleSubmit, isSubmitting, error, isValid } = useSolidsFormSubmit({
    babyId,
    selectedFoodIds: state.selectedFoodIds,
    foodInput: state.foodInput,
    // ... other props
  });

  return (
    <Sheet>
      {/* ... modal content ... */}
      <FormFooter
        onPrimary={handleSubmit}
        disabled={!isValid}  // ← Simple pass-through
        // ... other props
      />
    </Sheet>
  );
}
```

### Growth Modal Validation

**Submit hook**:
```typescript
export function useGrowthFormSubmit({
  weightG,
  heightMm,
  headCircumferenceMm,
  // ... other props
}: UseGrowthFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: Must have at least one measurement
  const isValid = weightG != null || heightMm != null || headCircumferenceMm != null;

  const handleSubmit = async () => {
    // ... submission logic
  };

  return { handleSubmit, isSubmitting, error, isValid };
}
```

### Medication Modal Validation

**Submit hook**:
```typescript
export function useMedicationFormSubmit({
  selectedMedicationId,
  medicationInput,
  amount,
  // ... other props
}: UseMedicationFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: Must have medication AND amount > 0
  const isValid =
    (selectedMedicationId != null || medicationInput.trim().length > 0) && amount > 0;

  const handleSubmit = async () => {
    // ... submission logic
  };

  return { handleSubmit, isSubmitting, error, isValid };
}
```

### Pumping Modal Validation

**Submit hook**:
```typescript
export function usePumpingFormSubmit({
  mode,
  leftMl,
  rightMl,
  totalMl,
  // ... other props
}: UsePumpingFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: Mode-specific amount checks
  const isValid =
    mode === 'leftRight'
      ? (leftMl > 0 || rightMl > 0)
      : totalMl > 0;

  const handleSubmit = async () => {
    // ... submission logic
  };

  return { handleSubmit, isSubmitting, error, isValid };
}
```

## Modal Coverage

This pattern is implemented across all 5 activity modals:

| Modal | Validation Logic | Key Props |
|-------|------------------|-----------|
| Feed | Timer elapsed ≥1s (timer mode) OR valid duration (manual mode) | `timerElapsed`, `inputMode`, `startTime`, `endTime` |
| Solids | Has selected foods OR typed input | `selectedFoodIds`, `foodInput` |
| Growth | At least one measurement entered | `weightG`, `heightMm`, `headCircumferenceMm` |
| Medication | Has medication AND amount > 0 | `selectedMedicationId`, `medicationInput`, `amount` |
| Pumping | Amount > 0 (mode-specific) | `mode`, `leftMl`, `rightMl`, `totalMl` |

## Benefits

1. **Single source of truth**: Validation logic lives in one place (submit hook)
2. **Testable**: Can unit test validation separately from UI
3. **Consistent pattern**: All modals follow same structure
4. **Thin orchestrators**: No inline validation in main components
5. **Reactive**: `isValid` recomputes when form state changes
6. **Type-safe**: TypeScript ensures all required props are passed

## Adding Validation to New Modals

When creating a new activity modal:

1. **In submit hook** (`use{Activity}FormSubmit.ts`):
   ```typescript
   export function useActivityFormSubmit(props) {
     // Compute validation based on props
     const isValid = /* validation logic */;

     return { handleSubmit, isSubmitting, error, isValid };
   }
   ```

2. **In orchestrator** (`Add{Activity}Modal.tsx`):
   ```typescript
   export function AddActivityModal(props) {
     const { state, actions } = useActivityFormState();
     const { handleSubmit, isSubmitting, error, isValid } = useActivityFormSubmit({
       // Pass form state needed for validation
     });

     return (
       <FormFooter
         onPrimary={handleSubmit}
         disabled={!isValid}  // ← Always do this
         isLoading={isSubmitting}
       />
     );
   }
   ```

## Gotchas

### 1. Reactive Props Required

**Issue**: `isValid` only recomputes when props change. If validation depends on state that isn't passed as a prop, it won't update.

**Solution**: Pass all state needed for validation to submit hook.

**Example (Feed modal)**:
```typescript
// ❌ Bad: timerElapsed not passed, validation won't update when timer changes
const { isValid } = useFeedFormSubmit({ method, inputMode });

// ✅ Good: Pass timerElapsed so validation recomputes when timer changes
const { isValid } = useFeedFormSubmit({ method, inputMode, timerElapsed });
```

### 2. Complex Validation State

**Issue**: Some modals need reactive state tracking (e.g., timer state subscription).

**Solution**: For simple validation (most cases), compute inline. For complex cases (timer), use `useEffect` + `useState` in submit hook.

**Example (Sleep modal with timer subscription)**:
```typescript
export function useSleepFormSubmit(options) {
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    if (options.inputMode !== 'timer') {
      setCanSave(true); // Manual mode always valid
      return;
    }

    // Subscribe to timer changes
    const unsubscribe = useTimerStore.subscribe(
      state => state.totalElapsedSeconds,
      totalElapsed => setCanSave(totalElapsed >= 60)
    );

    return unsubscribe;
  }, [options.inputMode]);

  return { handleSubmit, isSubmitting, error, isValid: canSave };
}
```

### 3. Don't Duplicate Validation

**Issue**: Tempting to add validation checks in orchestrator for UI feedback.

**Solution**: Keep ALL validation in submit hook. If you need UI feedback, derive it from the same state that submit hook uses.

**Example**:
```typescript
// ❌ Bad: Duplicated validation logic
export function AddModal({ ... }) {
  const { isValid } = useFormSubmit({ amount });
  const showWarning = amount === 0; // ← Duplication!

  return (
    <>
      {showWarning && <Warning />}
      <FormFooter disabled={!isValid} />
    </>
  );
}

// ✅ Good: Derive UI feedback from same state
export function AddModal({ ... }) {
  const { state } = useFormState();
  const { isValid } = useFormSubmit({ amount: state.amount });
  const showWarning = state.amount === 0; // ← Same state, different purpose

  return (
    <>
      {showWarning && <Warning />}
      <FormFooter disabled={!isValid} />
    </>
  );
}
```

## Related Patterns

- `.readme/chunks/ui-patterns.activity-modals.md` - Overall modal architecture
- `.readme/chunks/ui-patterns.zustand-selector-reactivity.md` - Reactive state tracking for complex validation (timer mode)
- `.readme/chunks/local-first.operations-layer-pattern.md` - Server-side validation in operations layer

## Testing

### Unit Tests for Validation Logic

Test submit hooks in isolation:

```typescript
import { renderHook } from '@testing-library/react';
import { useFeedFormSubmit } from './useFeedFormSubmit';

describe('useFeedFormSubmit validation', () => {
  it('should be invalid when timer mode has no elapsed time', () => {
    const { result } = renderHook(() => useFeedFormSubmit({
      method: 'breast',
      inputMode: 'timer',
      timerElapsed: 0,
      // ... other props
    }));

    expect(result.current.isValid).toBe(false);
  });

  it('should be valid when timer has elapsed time', () => {
    const { result } = renderHook(() => useFeedFormSubmit({
      method: 'breast',
      inputMode: 'timer',
      timerElapsed: 60,
      // ... other props
    }));

    expect(result.current.isValid).toBe(true);
  });
});
```

### Integration Tests

Test that FormFooter button is disabled when invalid:

```typescript
import { render, screen } from '@testing-library/react';
import { AddFeedModal } from './AddFeedModal';

describe('AddFeedModal validation', () => {
  it('should disable save button when timer has no elapsed time', () => {
    render(<AddFeedModal babyId={1} open={true} onOpenChange={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });
});
```
