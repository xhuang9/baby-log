---
last_verified_at: 2026-02-07T00:00:00Z
source_paths:
  - src/components/activity-modals/
  - src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/
  - src/app/[locale]/(auth)/(app)/overview/_components/add-sleep-modal/
  - src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/
  - src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/
  - src/app/[locale]/(auth)/(app)/overview/_components/add-medication-modal/
  - src/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/
---

# Activity Modal Pattern

## Purpose

Shared architecture for activity logging modals (feed, sleep, nappy, etc.) that provides consistent UX, modular code organization, and reusable components across all activity types.

## Why This Pattern Exists

Before the modular refactoring (Phase 3, completed 2026-01-23):
- AddFeedModal: 378 LOC monolithic component
- AddSleepModal: 268 LOC monolithic component
- All logic (state, validation, submission, UI) in single files
- Difficult to test individual concerns
- No code reuse between activity types

After modular refactoring:
- AddFeedModal: 10 modules (hooks + components)
- AddSleepModal: 8 modules (hooks + components)
- Shared component library in `components/activity-modals/`
- Each module <100 LOC, focused on single responsibility
- Testable hooks with clear boundaries
- Consistent pattern for future activity types (nappy, meal, medication, etc.)

## Architecture

### 1. Shared Components (`components/activity-modals/`)

All activity modals share these components:

#### `DurationDisplay.tsx`
Duration badge showing calculated time between start/end
```typescript
<DurationDisplay startTime={state.startTime} endTime={state.endTime} />
// Displays: "Duration: 1h 30m"
```

#### `ModeSwitch.tsx`
Toggle between timer and manual input modes
```typescript
<ModeSwitch
  inputMode={state.inputMode}
  onModeChange={actions.setInputMode}
/>
// Shows: "Use a timer" or "Manual entry" link
```

#### `utils.ts`
Shared duration calculations
```typescript
calculateDuration(startTime: Date, endTime: Date): number
formatDuration(minutes: number): string
// Examples:
// calculateDuration(10:00, 11:30) → 90
// formatDuration(90) → "1h 30m"
```

#### `types.ts`
Shared type definitions
```typescript
export type InputMode = 'timer' | 'manual';
```

### 2. Modal Structure Pattern

Every activity modal follows this folder structure:

```
add-{activity}-modal/
├── index.ts                    # Public API exports only
├── Add{Activity}Modal.tsx      # Orchestrator component (~130 LOC)
├── types.ts                    # Props, state, form types
├── hooks/
│   ├── index.ts                # Barrel exports
│   ├── use{Activity}FormState.ts      # State management
│   ├── useInitialize{Activity}Form.ts # Hydration & config
│   └── use{Activity}FormSubmit.ts     # Validation & save
└── components/
    ├── index.ts                # Barrel exports
    ├── TimerModeSection.tsx    # Timer mode UI
    ├── ManualModeSection.tsx   # Manual mode UI
    └── [...ActivitySpecific].tsx  # Activity-specific inputs
```

### 3. Hook Responsibilities

Each modal has three core hooks:

#### `use{Activity}FormState` - State Management
- Manages all form state (input mode, start/end times, activity-specific fields)
- Provides actions to update state
- Handles form reset logic
- **No side effects** - pure state container

Example (Sleep):
```typescript
export function useSleepFormState() {
  const [inputMode, setInputMode] = useState<InputMode>('timer');
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setMinutes(end.getMinutes() + 60); // Default 1h
    return end;
  });
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setInputMode('timer');
    setStartTime(new Date());
    // ... reset other fields
  };

  return {
    state: { inputMode, startTime, endTime, handMode },
    actions: { setInputMode, setStartTime, setEndTime, setHandMode, resetForm }
  };
}
```

#### `useInitialize{Activity}Form` - Hydration & Configuration
- Hydrates timer store when user is available
- Loads hand mode preference from IndexedDB
- Runs on mount via `useEffect`
- Handles async configuration loading

Example (Sleep):
```typescript
export function useInitializeSleepForm({
  isTimerHydrated,
  setHandMode,
}: UseInitializeSleepFormOptions) {
  const user = useUserStore(s => s.user);
  const hydrateTimer = useTimerStore(s => s.hydrate);

  // Hydrate timer store
  useEffect(() => {
    if (user?.localId && !isTimerHydrated) {
      hydrateTimer(user.localId);
    }
  }, [user?.localId, isTimerHydrated, hydrateTimer]);

  // Load hand preference
  useEffect(() => {
    async function loadHandMode() {
      if (!user?.localId) return;
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');
      } catch (err) {
        console.error('Failed to load hand mode:', err);
      }
    }
    loadHandMode();
  }, [user?.localId, setHandMode]);
}
```

#### `use{Activity}FormSubmit` - Validation & Persistence
- **Computes and exposes `isValid`** - Single source of truth for form validation
- Validates form inputs based on activity-specific rules
- Handles timer vs manual mode logic
- **Reactively tracks timer state** for button enable/disable (timer mode only)
- Calls operations layer for persistence
- Manages loading state and errors
- Triggers callbacks on success

**See** `.readme/chunks/ui-patterns.modal-validation.md` for detailed validation pattern across all modals.

Example (Sleep with Timer Validation):
```typescript
export function useSleepFormSubmit(options: UseSleepFormSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSave, setCanSave] = useState(false);

  // 1. Subscribe to timer changes for reactive button state
  useEffect(() => {
    if (options.inputMode !== 'timer') {
      setCanSave(true); // Manual mode always allows save
      return;
    }

    const unsubscribe = useTimerStore.subscribe(
      state => state.totalElapsedSeconds,
      totalElapsed => {
        // Save button only enabled if ≥60 seconds recorded
        setCanSave(totalElapsed >= 60);
      }
    );

    // Check initial timer state
    const initial = useTimerStore.getState().totalElapsedSeconds;
    setCanSave(initial >= 60);

    return unsubscribe;
  }, [options.inputMode]);

  // 2. Submit logic
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let durationMinutes: number;
      let sleepStartTime: Date;

      if (options.inputMode === 'timer') {
        // Pause timer, show confirmation, get timer data
        const timerData = await options.prepareTimerSave();
        if (!timerData) {
          setError('Please record a timer first');
          return;
        }
        durationMinutes = timerData.durationMinutes;
        sleepStartTime = timerData.startTime;
      } else {
        // Manual mode: calculate from inputs
        durationMinutes = calculateDuration(options.startTime, options.endTime);
        sleepStartTime = options.startTime;

        if (durationMinutes <= 0) {
          setError('End time must be after start time');
          return;
        }
      }

      // Call operations layer
      const result = await createSleepLog({
        babyId: options.babyId,
        startedAt: sleepStartTime,
        durationMinutes,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Success: reset timer, close modal, trigger callback
      if (options.inputMode === 'timer') {
        await options.completeTimerSave();
      }
      options.resetForm();
      options.onClose();
      options.onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error, isValid: canSave };
}
```

### 4. Main Orchestrator Component

The main modal component is a **slim orchestrator** that wires hooks together:

```typescript
export function AddSleepModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddSleepModalProps) {
  // 1. State management
  const { state, actions } = useSleepFormState();

  // 2. Timer integration
  const { isHydrated } = useTimerStore();
  const { prepareTimerSave, completeTimerSave } = useTimerSave({
    babyId,
    logType: 'sleep',
  });

  // 3. Initialization effects
  useInitializeSleepForm({
    isTimerHydrated: isHydrated,
    setHandMode: actions.setHandMode,
  });

  // 4. Submit logic with reactive timer validation
  const { handleSubmit, isSubmitting, error, isValid } = useSleepFormSubmit({
    babyId,
    inputMode: state.inputMode,
    startTime: state.startTime,
    endTime: state.endTime,
    prepareTimerSave,
    completeTimerSave,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 5. Open change handler
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      actions.resetForm();
    }
    onOpenChange(newOpen);
  };

  // 6. Render UI sections
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        {/* Header */}
        {/* Timer mode section */}
        {state.inputMode === 'timer' && <TimerModeSection babyId={babyId} />}
        {/* Manual mode section */}
        {state.inputMode === 'manual' && (
          <ManualModeSection
            startTime={state.startTime}
            onStartTimeChange={actions.setStartTime}
            endTime={state.endTime}
            onEndTimeChange={actions.setEndTime}
            handMode={state.handMode}
          />
        )}
        {/* Mode switch */}
        <ModeSwitch
          inputMode={state.inputMode}
          onModeChange={actions.setInputMode}
        />
        {/* Error display */}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {/* Footer with reactive save button */}
        <FormFooter
          onPrimary={handleSubmit}
          primaryLabel="Save"
          disabled={!isValid}
          isLoading={isSubmitting}
          handMode={state.handMode}
        />
      </SheetContent>
    </Sheet>
  );
}
```

**Key principles:**
- Main component ~130 LOC
- All logic delegated to hooks
- Clean data flow: state → hooks → UI
- Easy to understand at a glance

## Integration Points

### Timer Integration
```typescript
import { useTimerSave } from '@/hooks/useTimerSave';
import { useTimerStore } from '@/stores/useTimerStore';

const { isHydrated } = useTimerStore();
const { prepareTimerSave, completeTimerSave } = useTimerSave({
  babyId,
  logType: 'sleep', // or 'feed'
});
```

**Flow:**
1. `prepareTimerSave()` - Pauses timer, shows confirmation dialog, returns timer data
2. Use timer data (duration, start time) for persistence
3. `completeTimerSave()` - Resets timer state after successful save

### UI Config (Hand Mode)
```typescript
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';

const config = await getUIConfig(user.localId);
setHandMode(config.data.handMode ?? 'right');
```

**Hand mode affects:**
- Button layout in footer (left vs right aligned)
- Input control layouts (AmountSlider, TimeSwiper)

### Operations Layer (Persistence)
```typescript
import { createSleepLog } from '@/services/operations';

const result = await createSleepLog({
  babyId: options.babyId,
  startedAt: sleepStartTime,
  durationMinutes,
});

if (!result.success) {
  setError(result.error);
  return;
}
```

All activity modals use operations layer for:
- Input validation
- Access control checks
- IndexedDB writes
- Outbox enqueuing
- Background sync triggering

See `.readme/chunks/local-first.operations-layer-pattern.md`

## Configuration

| Setting | Location | Default | Description |
|---------|----------|---------|-------------|
| Hand Mode | IndexedDB `ui-config` | 'right' | Button layout preference (left-handed vs right-handed) |
| Timer Mode | Component state | 'timer' | Default input mode (timer vs manual) |
| Default Duration | Component state | Varies by activity | Sleep: 60m, Feed: varies by method |

## Testing Strategy

### 1. Hook Testing (Unit Tests)

Each hook should be tested in isolation:

**`use{Activity}FormState.test.ts`**
- Initial state values
- State updates via actions
- Form reset behavior

**`useInitialize{Activity}Form.test.ts`**
- Timer hydration when user available
- Hand mode loading from IndexedDB
- Graceful handling of missing user/config

**`use{Activity}FormSubmit.test.ts`**
- Timer mode validation & submission
- Manual mode validation & submission
- Error handling
- Success callbacks
- Form reset on success

**Mock dependencies:**
```typescript
vi.mock('@/stores/useUserStore', () => ({
  useUserStore: vi.fn(),
}));

vi.mock('@/stores/useTimerStore', () => ({
  useTimerStore: vi.fn(),
}));

vi.mock('@/lib/local-db/helpers/ui-config', () => ({
  getUIConfig: vi.fn(),
}));

vi.mock('@/services/operations', () => ({
  createSleepLog: vi.fn(),
}));
```

### 2. Component Testing

Test UI sections separately:
- `TimerModeSection` - Timer widget interaction
- `ManualModeSection` - Time picker interaction
- Main modal - Integration of hooks + UI

### 3. Integration Testing (E2E)

Test complete flows:
- Timer mode: start timer → wait → save → verify log created
- Manual mode: set times → save → verify log created
- Mode switching: timer → manual → timer
- Error cases: invalid inputs, access denied

## Adding a New Activity Modal

Follow these steps to create a new activity modal (e.g., nappy, meal, medication):

### 1. Create Folder Structure
```bash
mkdir -p src/app/[locale]/(auth)/(app)/overview/_components/add-{activity}-modal/{hooks,components}
```

### 2. Copy Template from Sleep Modal
Sleep modal is simpler than feed modal (no method toggle, no amount estimation), making it a better template:

```bash
# Copy structure
cp -r add-sleep-modal add-nappy-modal

# Rename files (do find/replace for Sleep → Nappy)
```

### 3. Define Types (`types.ts`)
```typescript
export type NappyFormState = {
  inputMode: InputMode;
  startTime: Date;
  endTime: Date;
  handMode: 'left' | 'right';
  type: 'wet' | 'dirty' | 'both';  // Activity-specific
  notes?: string;                  // Activity-specific
};

export type AddNappyModalProps = {
  babyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};
```

### 4. Create State Hook (`hooks/use{Activity}FormState.ts`)
- Define state fields (include activity-specific fields)
- Create setter actions
- Implement resetForm function

### 5. Create Initialize Hook (`hooks/useInitialize{Activity}Form.ts`)
- Copy from sleep modal
- Adjust for activity-specific config if needed

### 6. Create Submit Hook (`hooks/use{Activity}FormSubmit.ts`)
- Implement timer mode validation
- Implement manual mode validation
- Call appropriate operations layer function (e.g., `createNappyLog`)
- Handle success/error cases

### 7. Create UI Components (`components/`)
- `TimerModeSection.tsx` - Activity-specific timer UI
- `ManualModeSection.tsx` - Activity-specific manual inputs
- Import and use shared `DurationDisplay`, `ModeSwitch`

### 8. Create Main Orchestrator (`Add{Activity}Modal.tsx`)
- Wire up the three hooks
- Integrate timer save hooks
- Render UI sections based on input mode
- Add hand-mode aware footer

### 9. Create Operations Function
```typescript
// src/services/operations/nappy-log.ts
export async function createNappyLog(
  input: CreateNappyLogInput
): Promise<OperationResult<LocalNappyLog>>
```

See `.readme/chunks/local-first.operations-layer-pattern.md` for template

### 10. Export from Index
```typescript
// add-nappy-modal/index.ts
export { AddNappyModal } from './AddNappyModal';
export type { AddNappyModalProps } from './types';
```

### 11. Add Tests
Create test files for each hook (see Testing Strategy section)

## Gotchas / Constraints

### 1. Timer Hydration Required
**Issue:** Timer store must be hydrated before using timer mode
**Solution:** `useInitializeSleepForm` hydrates timer on mount
```typescript
useEffect(() => {
  if (user?.localId && !isTimerHydrated) {
    hydrateTimer(user.localId);
  }
}, [user?.localId, isTimerHydrated, hydrateTimer]);
```

### 2. Hand Mode Loads Async
**Issue:** Hand mode loads from IndexedDB asynchronously
**Solution:** Use default 'right', then update when loaded
```typescript
const [handMode, setHandMode] = useState<'left' | 'right'>('right');
// Later: setHandMode(config.data.handMode ?? 'right');
```

### 3. Timer Confirmation in prepareTimerSave
**Issue:** Must show confirmation dialog before saving timer
**Solution:** `prepareTimerSave()` handles pause + confirmation, don't duplicate
```typescript
const timerData = await options.prepareTimerSave();
// Returns null if user cancels, otherwise { durationMinutes, startTime }
```

### 4. Reset Form on Modal Close
**Issue:** Form retains stale state if not reset
**Solution:** Reset in `handleOpenChange` when closing
```typescript
const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    actions.resetForm();
  }
  onOpenChange(newOpen);
};
```

### 5. Manual Mode Duration Validation
**Issue:** Users can set end time before start time
**Solution:** Validate with `calculateDuration` before saving
```typescript
const duration = calculateDuration(startTime, endTime);
if (duration <= 0) {
  setError('End time must be after start time');
  return;
}
```

### 6. Modal Validation Pattern
**Issue:** Validation logic was duplicated between button disable state and submit handlers
**Solution:** Submit hooks compute and expose `isValid`, orchestrators pass `disabled={!isValid}` to FormFooter
```typescript
// In submit hook
export function useFeedFormSubmit(options) {
  // Compute validation
  const isValid = /* validation logic based on props */;

  const handleSubmit = async () => {
    // ... submission logic
  };

  return { handleSubmit, isSubmitting, error, isValid };
}

// In orchestrator
export function AddFeedModal({ ... }) {
  const { handleSubmit, isSubmitting, error, isValid } = useFeedFormSubmit({ ... });

  return (
    <FormFooter
      onPrimary={handleSubmit}
      disabled={!isValid}  // ← Single source of truth
      isLoading={isSubmitting}
    />
  );
}
```

**See** `.readme/chunks/ui-patterns.modal-validation.md` for complete pattern documentation across all 5 modals.

### 7. Timer Mode Validation: Reactive Button State
**Issue:** Save button should be disabled until user records ≥60 seconds on timer
**Solution:** Use Zustand subscriber pattern to reactively track timer state
```typescript
useEffect(() => {
  if (options.inputMode !== 'timer') {
    setCanSave(true); // Manual mode always allows save
    return;
  }

  // Subscribe to timer changes
  const unsubscribe = useTimerStore.subscribe(
    state => state.totalElapsedSeconds,
    totalElapsed => setCanSave(totalElapsed >= 60)
  );

  // Check initial state
  setCanSave(useTimerStore.getState().totalElapsedSeconds >= 60);

  return unsubscribe;
}, [options.inputMode]);

// Result: When user presses +1m button, Save button instantly enables
```

See `.readme/chunks/ui-patterns.zustand-selector-reactivity.md` for detailed pattern explanation.

## Comparison: Before vs After

### Before Refactoring
```typescript
// AddSleepModal.tsx (268 LOC)
export function AddSleepModal({ babyId, open, onOpenChange }) {
  // All state management
  const [inputMode, setInputMode] = useState('timer');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [handMode, setHandMode] = useState('right');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // All initialization logic
  useEffect(() => { /* hydrate timer */ }, []);
  useEffect(() => { /* load hand mode */ }, []);

  // All validation logic
  const handleSubmit = async () => {
    // 50+ lines of validation, timer handling, submission
  };

  // All UI rendering
  return (
    // 100+ lines of JSX
  );
}
```

**Problems:**
- Hard to test individual concerns
- Difficult to understand at a glance
- No code reuse across activity types
- Changes affect entire component

### After Refactoring
```typescript
// AddSleepModal.tsx (135 LOC)
export function AddSleepModal({ babyId, open, onOpenChange, onSuccess }) {
  const { state, actions } = useSleepFormState();
  const { isHydrated } = useTimerStore();
  const { prepareTimerSave, completeTimerSave } = useTimerSave({ babyId, logType: 'sleep' });

  useInitializeSleepForm({ isTimerHydrated: isHydrated, setHandMode: actions.setHandMode });

  const { handleSubmit, isSubmitting, error, isValid } = useSleepFormSubmit({
    babyId, inputMode: state.inputMode, startTime: state.startTime,
    endTime: state.endTime, prepareTimerSave, completeTimerSave,
    resetForm: actions.resetForm, onSuccess, onClose: () => onOpenChange(false),
  });

  return (
    // Clean UI sections
  );
}

// useSleepFormState.ts (48 LOC)
// useInitializeSleepForm.ts (41 LOC)
// useSleepFormSubmit.ts (92 LOC)
// components/TimerModeSection.tsx (50 LOC)
// components/ManualModeSection.tsx (60 LOC)
```

**Benefits:**
- Each module <100 LOC, focused on one concern
- Hooks testable in isolation
- Shared components reusable (DurationDisplay, ModeSwitch)
- Clear separation: state, initialization, submission, UI
- Easy to locate and fix bugs

## Related Systems

- `.readme/chunks/feed-logging.timer-widget.md` - Timer implementation details
- `.readme/chunks/feed-logging.timer-integration.md` - Timer/manual mode switching
- `.readme/chunks/feed-logging.ui-components.md` - Activity tiles, hand-mode patterns
- `.readme/chunks/local-first.operations-layer-pattern.md` - Service layer for persistence
- `.readme/chunks/feed-logging.schema-design.md` - Activity log database schema
