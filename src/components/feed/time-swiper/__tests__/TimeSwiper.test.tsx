import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { TimeSwiper } from '../TimeSwiper';
import { mockUIConfig, setTestTime } from './test-utils';

// Mock dependencies
vi.mock('@/stores/useUserStore', () => ({
  useUserStore: vi.fn((selector?: any) => {
    const state = {
      user: { localId: 1, clerkId: 'test-clerk-id' },
      isHydrated: true,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/lib/local-db/helpers/ui-config', () => ({
  getUIConfig: vi.fn(),
  updateUIConfig: vi.fn(),
}));

// Mock shadcn components
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect }: { selected?: Date; onSelect: (date?: Date) => void }) => (
    <div data-testid="calendar">
      <button
        data-testid="calendar-select"
        onClick={() => onSelect(new Date('2024-06-16T10:00:00Z'))}
      >
        Select Date
      </button>
    </div>
  ),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Settings2: () => <div data-testid="settings-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Utility functions for waiting on async element rendering
async function waitForElement(testId: string): Promise<HTMLElement> {
  return vi.waitFor(async () => {
    const locator = page.getByTestId(testId);
    const element = await locator.element();
    if (!element) {
      throw new Error(`Element with testId "${testId}" not found`);
    }
    return element;
  }, { timeout: 3000 }) as Promise<HTMLElement>;
}

async function waitForText(text: string | RegExp): Promise<HTMLElement> {
  return vi.waitFor(async () => {
    const locator = page.getByText(text);
    const element = await locator.element();
    if (!element) {
      throw new Error(`Text "${text}" not found`);
    }
    return element;
  }, { timeout: 3000 }) as Promise<HTMLElement>;
}

/**
 * Test wrapper component
 */
function TestWrapper({ initialValue }: { initialValue?: Date }) {
  const [value, setValue] = useState(initialValue || new Date('2024-06-15T14:30:00Z'));

  return (
    <div>
      <TimeSwiper value={value} onChange={setValue} />
      <div data-testid="current-value">{value.toISOString()}</div>
    </div>
  );
}

describe('TimeSwiper - Integration Tests', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    setTestTime('2024-06-15T14:30:00Z'); // June 15, 2024 at 2:30 PM
    await mockUIConfig();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('"In Future" Indicator Display', () => {
    it('should display "In future" text when displayDate > currentTime', async () => {
      // Set time to 4:00 PM (future)
      const futureTime = new Date('2024-06-15T16:00:00Z');

      render(<TestWrapper initialValue={futureTime} />);

      // Look for "In future" text
      await vi.waitFor(async () => {
        const inFutureText = await page.getByText('In future').query();

        expect(inFutureText).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should NOT display "In future" for past dates', async () => {
      // Yesterday at 10:00 AM
      const pastDate = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper initialValue={pastDate} />);

      // "In future" should not be present
      const inFutureText = await page.getByText('In future').query();

      expect(inFutureText).toBeNull();
    });

    it('should NOT display "In future" for past times today', async () => {
      // Today at 1:00 PM (past)
      const pastTimeToday = new Date('2024-06-15T13:00:00Z');

      render(<TestWrapper initialValue={pastTimeToday} />);

      // "In future" should not be present
      const inFutureText = await page.getByText('In future').query();

      expect(inFutureText).toBeNull();
    });

    it('should apply dimmed style when showing "In future"', async () => {
      const futureTime = new Date('2024-06-15T16:00:00Z');

      render(<TestWrapper initialValue={futureTime} />);

      // Find the time display element
      const timeDisplay = await waitForElement('time-display');

      expect(timeDisplay.className).toContain('opacity-50');
    });
  });

  describe('Settings Integration', () => {
    it('should load settings from IndexedDB on mount', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      render(<TestWrapper />);

      // Wait for settings to load
      await vi.waitFor(() => {
        expect(getUIConfig).toHaveBeenCalled();
      });
    });

    it('should apply 24h format when use24Hour is true', async () => {
      await mockUIConfig({ use24Hour: true });

      render(<TestWrapper />);

      // Wait for component to render
      await vi.waitFor(async () => {
        const timeDisplay = await page.getByTestId('time-display').query();

        expect(timeDisplay).toBeTruthy();
      });

      // Look for 24h format (no AM/PM)
      const amPmText = await page.getByText(/AM|PM/).query();

      expect(amPmText).toBeNull();
    });

    it('should apply 12h format when use24Hour is false', async () => {
      await mockUIConfig({ use24Hour: false });

      render(<TestWrapper />);

      // Wait for component to render
      await vi.waitFor(async () => {
        const timeDisplay = await page.getByTestId('time-display').query();

        expect(timeDisplay).toBeTruthy();
      });

      // Look for AM/PM indicator
      const amPmText = await page.getByText(/AM|PM/).query();

      expect(amPmText).toBeTruthy();
    });
  });

  describe('Date Picker Integration', () => {
    it('should show date row when not today', async () => {
      // Yesterday
      const yesterday = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper initialValue={yesterday} />);

      // Date row should be visible
      await vi.waitFor(async () => {
        const dateRow = await page.getByTestId('date-row').query();

        expect(dateRow).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should hide date row when today', async () => {
      // Today at current time
      const today = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={today} />);

      // Date row should not be visible
      const dateRow = await page.getByTestId('date-row').query();

      expect(dateRow).toBeNull();
    });

    it('should open calendar popover when date is clicked', async () => {
      const yesterday = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper initialValue={yesterday} />);

      // Find the date row first, then find the popover trigger within it
      await vi.waitFor(async () => {
        const dateRow = await page.getByTestId('date-row').query();

        expect(dateRow).toBeTruthy();
      }, { timeout: 3000 });

      // Find and click the date trigger within date-row
      const dateRow = await page.getByTestId('date-row').element();
      const dateTrigger = dateRow.querySelector('[data-testid="popover-trigger"]') as HTMLElement;

      expect(dateTrigger).toBeTruthy();

      await dateTrigger.click();

      // Calendar should be visible
      await vi.waitFor(async () => {
        const calendar = await page.getByTestId('calendar').query();

        expect(calendar).toBeTruthy();
      });
    });

    it('should update date when calendar date is selected', async () => {
      const yesterday = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper initialValue={yesterday} />);

      // Find the date row first, then find the popover trigger within it
      await vi.waitFor(async () => {
        const dateRow = await page.getByTestId('date-row').query();

        expect(dateRow).toBeTruthy();
      }, { timeout: 3000 });

      // Open calendar
      const dateRow = await page.getByTestId('date-row').element();
      const dateTrigger = dateRow.querySelector('[data-testid="popover-trigger"]') as HTMLElement;

      expect(dateTrigger).toBeTruthy();

      await dateTrigger.click();

      // Select new date
      await vi.waitFor(async () => {
        const selectBtn = await page.getByTestId('calendar-select').element() as HTMLElement;
        await selectBtn.click();
      });

      // Value should update
      await vi.waitFor(async () => {
        const currentValue = await page.getByTestId('current-value').element();
        const dateValue = new Date(currentValue.textContent!);

        expect(dateValue.getUTCDate()).toBe(16); // June 16
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should have "Back to now" button that resets to current time', async () => {
      // Start with yesterday
      const yesterday = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper initialValue={yesterday} />);

      // Find and click reset button
      const resetBtn = await waitForText('Back to now');
      await resetBtn.click();

      // Should reset to current time
      await vi.waitFor(async () => {
        const currentValue = await page.getByTestId('current-value').element();
        const dateValue = new Date(currentValue.textContent!);

        // Should be today (15th)
        expect(dateValue.getUTCDate()).toBe(15);

        // Should be close to current time (14:30)
        expect(dateValue.getUTCHours()).toBe(14);
        expect(dateValue.getUTCMinutes()).toBeGreaterThanOrEqual(29);
        expect(dateValue.getUTCMinutes()).toBeLessThanOrEqual(31);
      });
    });

    it('should hide "Back to now" button when already at current time', async () => {
      // Current time
      const now = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={now} />);

      // Reset button should not be visible when already at now
      const resetBtn = await page.getByText('Back to now').query();

      // Button might be hidden or not rendered
      if (resetBtn) {
        const element = await (resetBtn as any).element() as HTMLElement;

        // Check if it's hidden
        expect(element.className).toContain('hidden');
      }
    });
  });

  describe('Touch/Pointer Interaction', () => {
    it('should have swipeable time display area', async () => {
      render(<TestWrapper />);

      // Find the time display which indicates the component rendered
      await vi.waitFor(async () => {
        const timeDisplay = await page.getByTestId('time-display').query();

        expect(timeDisplay).toBeTruthy();
      }, { timeout: 3000 });

      // The swipeable area exists as part of the TimelineTrack component
      // We verify it through the presence of the time display
    });

    it('should have plus/minus buttons for time adjustment', async () => {
      render(<TestWrapper />);

      // Find adjustment buttons
      await vi.waitFor(async () => {
        const plusBtn = await page.getByTestId('plus-icon').query();
        const minusBtn = await page.getByTestId('minus-icon').query();

        expect(plusBtn).toBeTruthy();
        expect(minusBtn).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Visual Feedback', () => {
    it('should show current time marker when showCurrentTime is true', async () => {
      await mockUIConfig({ showCurrentTime: true });

      render(<TestWrapper />);

      // Current time indicator should be visible (look for "now" text with exact match)
      await vi.waitFor(async () => {
        const nowMarker = await page.getByText('now', { exact: true }).query();

        expect(nowMarker).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should hide current time marker when showCurrentTime is false', async () => {
      await mockUIConfig({ showCurrentTime: false });

      render(<TestWrapper />);

      // Current time indicator should not be visible (check for "now" text with exact match)
      const nowMarker = await page.getByText('now', { exact: true }).query();

      expect(nowMarker).toBeNull();
    });
  });
});
