import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useTimeSwiperState } from '../../hooks/useTimeSwiperState';
import { waitForElement } from '../test-utils';

// Mock the user store
vi.mock('@/stores/useUserStore', () => ({
  useUserStore: vi.fn((selector?: any) => {
    const state = {
      user: { localId: 1, clerkId: 'test-clerk-id' },
      isHydrated: true,
    };
    return selector ? selector(state) : state;
  }),
}));

/**
 * Test wrapper component that exposes hook state for testing
 */
function TestWrapper({
  value,
  dayOffset,
}: {
  value: Date;
  dayOffset: number;
}) {
  const [currentDayOffset, setDayOffset] = useState(dayOffset);
  const [currentValue, setCurrentValue] = useState(value);

  const {
    displayDate,
    currentTime,
    minSelectableDate,
    maxSelectableDate,
    handleResetToNow,
  } = useTimeSwiperState({
    value: currentValue,
    onChange: setCurrentValue,
    dayOffset: currentDayOffset,
    setDayOffset,
  });

  const isInFuture = displayDate > currentTime;

  return (
    <div>
      <div data-testid="display-date">{displayDate.toISOString()}</div>
      <div data-testid="current-time">{currentTime.toISOString()}</div>
      <div data-testid="is-in-future">{isInFuture ? 'true' : 'false'}</div>
      <div data-testid="min-date">{minSelectableDate.toISOString()}</div>
      <div data-testid="max-date">{maxSelectableDate.toISOString()}</div>
      <button data-testid="reset-btn" onClick={handleResetToNow}>
        Reset
      </button>
      <button
        data-testid="change-offset-btn"
        onClick={() => setDayOffset(currentDayOffset - 1)}
      >
        Change Offset
      </button>
    </div>
  );
}

describe('useTimeSwiperState - "In future" detection', () => {
  beforeEach(() => {
    // Set current time to June 15, 2024 at 2:30 PM (14:30)
    vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Critical "In Future" Bug Tests', () => {
    it('should NOT show "In future" for past dates with future times', async () => {
      // Bug scenario: Yesterday (June 14) at 4:00 PM
      // displayDate = yesterday + time = June 14, 4:00 PM (in the past)
      // currentTime = today 2:30 PM
      // Result: displayDate < currentTime → NOT in future
      const yesterdayWithFutureTime = new Date('2024-06-14T16:00:00Z'); // Yesterday at 4:00 PM

      render(<TestWrapper value={yesterdayWithFutureTime} dayOffset={-1} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('false');
    });

    it('should show "In future" for future times today', async () => {
      // Now: 2:30 PM, selected: 4:00 PM today
      const futureTimeToday = new Date('2024-06-15T16:00:00Z'); // Today at 4:00 PM

      render(<TestWrapper value={futureTimeToday} dayOffset={0} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('true');
    });

    it('should NOT show "In future" for past times today', async () => {
      // Now: 2:30 PM, selected: 1:00 PM today
      const pastTimeToday = new Date('2024-06-15T13:00:00Z'); // Today at 1:00 PM

      render(<TestWrapper value={pastTimeToday} dayOffset={0} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('false');
    });

    it('should show "In future" for future dates', async () => {
      // Tomorrow at any time
      const tomorrowMorning = new Date('2024-06-16T09:00:00Z'); // Tomorrow at 9:00 AM

      render(<TestWrapper value={tomorrowMorning} dayOffset={1} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('true');
    });

    it('should update "In future" when dayOffset changes', async () => {
      // Start with today at 4:00 PM (future)
      const futureTime = new Date('2024-06-15T16:00:00Z');

      render(<TestWrapper value={futureTime} dayOffset={0} />);

      let isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('true');

      // Click button to change offset to -1 (yesterday)
      await page.getByTestId('change-offset-btn').click();

      // Wait for state update
      await vi.waitFor(async () => {
        isInFuture = await waitForElement('is-in-future');

        expect(isInFuture).toHaveTextContent('false');
      });
    });

    it('should handle edge case: exact current time', async () => {
      // Exactly current time (2:30 PM)
      const exactCurrentTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper value={exactCurrentTime} dayOffset={0} />);

      const isInFuture = await waitForElement('is-in-future');

      // displayDate <= currentTime → NOT in future
      expect(isInFuture).toHaveTextContent('false');
    });
  });

  describe('Date Calculation', () => {
    it('should calculate displayDate correctly with positive dayOffset', async () => {
      const baseTime = new Date('2024-06-15T10:00:00Z'); // Today at 10:00 AM

      render(<TestWrapper value={baseTime} dayOffset={1} />);

      const displayDate = await waitForElement('display-date');
      const displayDateValue = new Date(displayDate.textContent!);

      // Should be tomorrow at 10:00 AM
      expect(displayDateValue.getUTCDate()).toBe(16);
      expect(displayDateValue.getUTCHours()).toBe(10);
      expect(displayDateValue.getUTCMinutes()).toBe(0);
    });

    it('should calculate displayDate correctly with negative dayOffset', async () => {
      const baseTime = new Date('2024-06-15T10:00:00Z'); // Today at 10:00 AM

      render(<TestWrapper value={baseTime} dayOffset={-2} />);

      const displayDate = await waitForElement('display-date');
      const displayDateValue = new Date(displayDate.textContent!);

      // Should be June 13 at 10:00 AM (2 days ago)
      expect(displayDateValue.getUTCDate()).toBe(13);
      expect(displayDateValue.getUTCHours()).toBe(10);
      expect(displayDateValue.getUTCMinutes()).toBe(0);
    });

    it('should maintain time when changing baseDate', async () => {
      const baseTime = new Date('2024-06-15T15:45:00Z'); // 3:45 PM

      render(<TestWrapper value={baseTime} dayOffset={0} />);

      const displayDate = await waitForElement('display-date');
      const displayDateValue = new Date(displayDate.textContent!);

      // Time should be preserved (15:45)
      expect(displayDateValue.getUTCHours()).toBe(15);
      expect(displayDateValue.getUTCMinutes()).toBe(45);
    });
  });

  describe('Date Picker Range', () => {
    it('should set minDate to 1 year ago', async () => {
      const baseTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper value={baseTime} dayOffset={0} />);

      const minDate = await waitForElement('min-date');
      const minDateValue = new Date(minDate.textContent!);
      const expectedMinDate = new Date('2024-06-15T14:30:00Z'); // Current time
      expectedMinDate.setFullYear(expectedMinDate.getFullYear() - 1);

      expect(minDateValue.getFullYear()).toBe(expectedMinDate.getFullYear());
      expect(minDateValue.getMonth()).toBe(expectedMinDate.getMonth());
      expect(minDateValue.getDate()).toBe(expectedMinDate.getDate());
    });

    it('should set maxDate to tomorrow', async () => {
      const baseTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper value={baseTime} dayOffset={0} />);

      const maxDate = await waitForElement('max-date');
      const maxDateValue = new Date(maxDate.textContent!);

      // maxDate is currentTime + 1 day
      // currentTime is mocked to 2024-06-15T14:30:00Z
      const expectedMaxDate = new Date('2024-06-15T14:30:00Z');
      expectedMaxDate.setDate(expectedMaxDate.getDate() + 1);
      expectedMaxDate.setHours(23, 59, 59, 999);

      expect(maxDateValue.getDate()).toBe(expectedMaxDate.getDate());
      expect(maxDateValue.getMonth()).toBe(expectedMaxDate.getMonth());
      expect(maxDateValue.getFullYear()).toBe(expectedMaxDate.getFullYear());
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to current time when resetToNow is called', async () => {
      // Start with past time (June 14 with offset -1 = June 13)
      const pastTime = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper value={pastTime} dayOffset={-1} />);

      // Verify initial state (June 14 + offset -1 = June 13)
      let displayDate = await waitForElement('display-date');
      let displayDateValue = new Date(displayDate.textContent!);

      expect(displayDateValue.getUTCDate()).toBe(13);

      // Click reset button
      await page.getByTestId('reset-btn').click();

      // Wait for state update
      await vi.waitFor(async () => {
        displayDate = await waitForElement('display-date');
        const currentTime = await waitForElement('current-time');
        displayDateValue = new Date(displayDate.textContent!);
        const currentTimeValue = new Date(currentTime.textContent!);

        // displayDate should be very close to currentTime (within a few ms)
        const timeDiff = Math.abs(
          displayDateValue.getTime() - currentTimeValue.getTime(),
        );

        expect(timeDiff).toBeLessThan(1000); // Within 1 second
      });
    });

    it('should reset dayOffset to 0 after resetToNow', async () => {
      const pastTime = new Date('2024-06-14T10:00:00Z');

      render(<TestWrapper value={pastTime} dayOffset={-1} />);

      await page.getByTestId('reset-btn').click();

      // After reset, should not be in the past
      await vi.waitFor(async () => {
        const displayDate = await waitForElement('display-date');
        const displayDateValue = new Date(displayDate.textContent!);

        // Should be today (15th)
        expect(displayDateValue.getUTCDate()).toBe(15);
      });
    });
  });
});
