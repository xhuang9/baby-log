---
last_verified_at: 2026-02-02T00:00:00Z
source_paths:
  - src/components/feed/time-swiper/__tests__/TimeSwiper.test.tsx
  - src/components/feed/time-swiper/__tests__/hooks/useTimeSwiperAnimation.test.tsx
  - src/components/feed/time-swiper/__tests__/hooks/useTimeSwiperSettings.test.tsx
  - src/components/feed/time-swiper/__tests__/hooks/useTimeSwiperState.test.tsx
  - src/components/feed/time-swiper/__tests__/test-utils.ts
  - src/components/feed/time-swiper/TimeSwiper.tsx
  - src/components/feed/time-swiper/hooks/useTimeSwiperAnimation.ts
  - src/components/feed/time-swiper/hooks/useTimeSwiperSettings.ts
  - src/components/feed/time-swiper/hooks/useTimeSwiperState.ts
---

# TimeSwiper Component Testing

## Purpose

Comprehensive test suite for TimeSwiper component and its hooks using Vitest browser mode. Tests cover animation, state management, settings persistence, and pointer gesture interactions.

## Testing Environment

### Vitest Browser Mode

Tests run in browser environment (`vitest.config.mts` browser project):
- Full DOM simulation via Playwright/WebDriver
- Real pointer events (not JSDOM)
- requestAnimationFrame support
- IndexedDB and localStorage access

**Test file pattern**: `src/components/feed/time-swiper/__tests__/*.test.tsx`

## Test Utilities

### Location

`src/components/feed/time-swiper/__tests__/test-utils.ts`

### Key Helpers

#### Element & Text Queries

```typescript
export async function waitForElement(testId: string)
export async function waitForText(text: string)
```

Handles async timing issues in vitest-browser-react. Waits up to 3 seconds for elements to appear in DOM.

**Usage**:
```typescript
const element = await waitForElement('time-display');
expect(element).toBeDefined();
```

#### User Store Mocking

```typescript
export async function mockUserStore(userId = 1)
```

Consistently mocks `useUserStore` across tests. Provides:
- `user.localId`: Numeric ID (defaults to 1)
- `user.clerkId`: Clerk ID (formatted as `clerk-${userId}`)
- `isHydrated`: Set to true

**Usage**:
```typescript
beforeEach(async () => {
  await mockUserStore(2); // Different user for isolation tests
});
```

#### UI Config Mocking

```typescript
export async function mockUIConfig(overrides?: Partial<TimeSwiper Settings>)
```

Mocks `getUIConfig` helper with default TimeSwiper settings:

```typescript
type TimeSwiper Settings = {
  use24Hour: boolean;           // Default: false (12-hour)
  swipeSpeed: number;            // Default: 1.0
  swipeResistance: 'smooth' | 'default' | 'sticky';  // Default: 'default'
  showCurrentTime: boolean;      // Default: true
  markerMode: 'line' | 'triangle'; // Default: 'line'
};
```

**Usage**:
```typescript
// Override specific settings
await mockUIConfig({
  use24Hour: true,
  swipeSpeed: 2.0,
});
```

#### Pointer Drag Simulation

```typescript
export function simulatePointerDrag(
  element: HTMLElement,
  startX: number,
  endX: number,
  steps = 5,
)
```

Simulates multi-step pointer drag gesture:
1. `pointerdown` at startX
2. Multiple `pointermove` events across steps
3. `pointerup` at endX

Useful for testing swipe-based time selection.

**Usage**:
```typescript
const swiper = await waitForElement('time-swiper');
simulatePointerDrag(swiper, 100, 50, 10); // Drag left 50px in 10 steps
```

#### Time Control Helpers

```typescript
export function setTestTime(dateString: string)
export function advanceTime(ms: number)
```

**setTestTime**: Sets system clock to specific date for testing time-based logic.
```typescript
beforeEach(() => {
  setTestTime('2026-02-02T12:00:00Z');
});
```

**advanceTime**: Advances timers by milliseconds (useful for testing update intervals).
```typescript
it('updates every 100ms', () => {
  advanceTime(100);
  expect(display).toBe('12:00');
  advanceTime(100);
  expect(display).toBe('12:00'); // Still same minute
});
```

#### Animation Frame Mocking

```typescript
export function setupAnimationFrameMock()
```

Mocks `window.requestAnimationFrame` and `window.cancelAnimationFrame` for testing animation updates.

Returns:
- `triggerNextFrame(timestamp?)`: Executes all pending animation frame callbacks
- `cleanup()`: Restores original RAF/CAF

**Usage**:
```typescript
it('animates smoothly', () => {
  const { triggerNextFrame, cleanup } = setupAnimationFrameMock();

  // Component setup that uses RAF...
  triggerNextFrame();
  expect(animationProgress).toBe(0.5); // Halfway through animation

  cleanup();
});
```

## Hook-Level Tests

### useTimeSwiperState

**Location**: `src/components/feed/time-swiper/__tests__/hooks/useTimeSwiperState.test.tsx`

Tests state management for selected time and date:

- **Initial state**: Defaults to current time/date
- **Time updates**: Selected time changes correctly
- **Date updates**: Selected date changes and time constraints update
- **Boundary handling**: Enforces -7 to +1 day range
- **Reset behavior**: Resets to current time on demand

**Key patterns**:
```typescript
it('initializes to current time', () => {
  setTestTime('2026-02-02T12:30:45Z');
  const { selectedTime } = useTimeSwiperState();
  expect(selectedTime.getHours()).toBe(12);
  expect(selectedTime.getMinutes()).toBe(30);
});

it('clamps date within range', () => {
  const { selectDate } = useTimeSwiperState();
  selectDate(new Date('2026-01-20')); // Before -7 day boundary
  const state = /* ... */;
  expect(state.selectedDate).toBe(expectedBoundary);
});
```

### useTimeSwiperAnimation

**Location**: `src/components/feed/time-swiper/__tests__/hooks/useTimeSwiperAnimation.test.tsx`

Tests animation state transitions:

- **Drag start**: Starts animation, cancels momentum
- **Dragging**: Updates animation offset in real-time
- **Drag end**: Triggers momentum with deceleration
- **Momentum**: Applies inertia-based animation
- **Resistance modes**: Tests 'smooth', 'default', 'sticky' behaviors

**Key patterns**:
```typescript
it('applies momentum deceleration', () => {
  const { startMomentum } = useTimeSwiperAnimation();
  startMomentum(100); // Initial velocity

  // After first frame (100ms decay)
  expect(velocity).toBeLessThan(100);

  // Animation continues until friction stops it
});
```

### useTimeSwiperSettings

**Location**: `src/components/feed/time-swiper/__tests__/hooks/useTimeSwiperSettings.test.tsx`

Tests settings persistence and UI mode changes:

- **Load settings**: Hydrates from UIConfig on mount
- **Save settings**: Persists changes to IndexedDB
- **12/24 hour format**: Format changes affect display
- **Swipe resistance**: Friction modes affect drag behavior
- **Marker mode**: Line vs triangle indicator changes
- **Show current time**: Displays/hides current time reference

**Key patterns**:
```typescript
it('persists use24Hour setting', async () => {
  const { settings, updateSettings } = useTimeSwiperSettings();

  await updateSettings({ use24Hour: true });

  // Verify saved to IndexedDB via UIConfig
  const saved = await getUIConfig();
  expect(saved.data.timeSwiper.use24Hour).toBe(true);
});
```

## Component-Level Tests

### TimeSwiper Component

**Location**: `src/components/feed/time-swiper/__tests__/TimeSwiper.test.tsx`

Integration tests for complete TimeSwiper component:

- **Rendering**: Initial display with correct time/date
- **Swipe gestures**: Pointer drag changes selected time
- **Date selection**: Calendar picker changes date
- **Time jumping**: Tapping hour/minute selectors
- **Output format**: Correct formatting based on settings
- **Accessibility**: Keyboard navigation and screen reader support

**Test structure**:
```typescript
describe('TimeSwiper', () => {
  // Setup
  beforeEach(async () => {
    await mockUserStore();
    await mockUIConfig();
    setTestTime('2026-02-02T10:30:00Z');
  });

  it('displays current time on load', async () => {
    render(<TimeSwiper onChange={vi.fn()} />);
    const display = await waitForElement('time-display');
    expect(display.textContent).toContain('10:30');
  });

  it('updates time on swipe', async () => {
    const onChange = vi.fn();
    render(<TimeSwiper onChange={onChange} />);

    const swiper = await waitForElement('time-swiper');
    simulatePointerDrag(swiper, 200, 150, 5); // Swipe left

    expect(onChange).toHaveBeenCalledWith(expectedTime);
  });

  it('opens calendar on date button click', async () => {
    render(<TimeSwiper onChange={vi.fn()} />);

    const dateBtn = await waitForElement('select-date');
    await dateBtn.click();

    const calendar = await waitForElement('calendar');
    expect(calendar).toBeDefined();
  });
});
```

## Mocking Patterns

### Module Mocking

```typescript
vi.mock('@/stores/useUserStore', () => ({
  useUserStore: vi.fn((selector?: any) => {
    const state = {
      user: { localId: 1, clerkId: 'test-clerk-id' },
      isHydrated: true,
    };
    return selector ? selector(state) : state;
  }),
}));
```

### shadcn Component Mocking

simplification: shadcn components mocked as divs with data-testid attributes:

```typescript
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }) => <div>{children}</div>,
  PopoverTrigger: ({ children }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));
```

**Why**: Full shadcn component rendering in browser tests is slow; mocking isolates TimeSwiper logic testing.

### Icon Mocking

```typescript
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  // ... other icons
}));
```

## Testing Best Practices

### 1. Async Element Queries

Always use `waitForElement` for dynamic content:
```typescript
// Bad: May fail if render is async
const element = document.querySelector('[data-testid="time"]');

// Good: Waits for element
const element = await waitForElement('time');
```

### 2. Time Isolation

Set test time in `beforeEach` to avoid flakiness:
```typescript
beforeEach(() => {
  setTestTime('2026-02-02T12:00:00Z'); // Consistent reference time
});
```

### 3. Settings Hydration

Always mock UIConfig before rendering TimeSwiper:
```typescript
beforeEach(async () => {
  await mockUIConfig(); // Must happen before render
  render(<TimeSwiper />);
});
```

### 4. Gesture Simulation

Use `simulatePointerDrag` for consistent swipe testing:
```typescript
// Drag 100px left over 10 steps
simulatePointerDrag(element, 200, 100, 10);
```

### 5. Mock Cleanup

Vitest browser mode auto-cleans between tests, but explicitly cleanup RAF mocks:
```typescript
afterEach(() => {
  vi.clearAllMocks(); // Clear module mocks
});
```

## Common Assertions

### Time Format Assertions

```typescript
// 12-hour format
expect(display).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);

// 24-hour format
expect(display).toMatch(/^\d{2}:\d{2}$/);
```

### Event Listener Assertions

```typescript
const onChange = vi.fn();
render(<TimeSwiper onChange={onChange} />);

// Simulate swipe
simulatePointerDrag(swiper, 200, 100);

expect(onChange).toHaveBeenCalledWith(
  expect.objectContaining({
    hours: expect.any(Number),
    minutes: expect.any(Number),
  })
);
```

### DOM State Assertions

```typescript
// Button enabled state
const saveBtn = await waitForElement('save-button');
expect(saveBtn).toHaveAttribute('disabled', '');

// Style changes
const marker = await waitForElement('marker');
expect(marker).toHaveStyle('transform: translateX(150px)');
```

## Debugging Test Failures

### Enable Debug Output

```typescript
import { page } from 'vitest/browser';

it('debug helper', async () => {
  const element = await waitForElement('time-display');
  console.log(element.outerHTML); // Inspect DOM
  console.log(page.screenshot()); // Capture screenshot
});
```

### Check Mocks

```typescript
vi.mocked(useUserStore).mock Calls // See all calls to mocked function
vi.mocked(getUIConfig).mock Results // See return values
```

### Wait Timeout

Increase timeout for slow operations:
```typescript
export async function waitForElement(testId: string, timeout = 5000) {
  return vi.waitFor(() => page.getByTestId(testId).element(), {
    timeout,
  });
}
```

## Related

- `.readme/chunks/testing.vitest-dual-mode.md` - Vitest configuration and browser mode setup
- `.readme/chunks/feed-logging.timeswiper-date-range.md` - TimeSwiper date boundary logic
- `.readme/chunks/feed-logging.dual-time-swiper.md` - TimeSwiper component patterns
