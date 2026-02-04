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
  fixedBaseDate,
}: {
  value: Date;
  dayOffset: number;
  fixedBaseDate?: Date;
}) {
  const [currentDayOffset, setDayOffset] = useState(dayOffset);
  const [currentValue, setCurrentValue] = useState(value);

  const [resolvedFixedBaseDate] = useState(() => {
    if (fixedBaseDate) return fixedBaseDate;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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
    fixedBaseDate: resolvedFixedBaseDate,
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
      // Value is 23 hours ago: on yesterday's local date, with a time-of-day that would
      // be "in the future" if it were today — but the date component keeps it in the past.
      const now = new Date();
      const yesterdayWithFutureTime = new Date(now.getTime() - 23 * 60 * 60 * 1000);

      render(<TestWrapper value={yesterdayWithFutureTime} dayOffset={-1} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('false');
    });

    it('should show "In future" for future times today', async () => {
      // Value is 30 minutes from now — same local date, but ahead of currentTime.
      const now = new Date();
      const futureTimeToday = new Date(now.getTime() + 30 * 60 * 1000);

      render(<TestWrapper value={futureTimeToday} dayOffset={0} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('true');
    });

    it('should NOT show "In future" for past times today', async () => {
      // Value is 30 minutes ago — same local date, behind currentTime.
      const now = new Date();
      const pastTimeToday = new Date(now.getTime() - 30 * 60 * 1000);

      render(<TestWrapper value={pastTimeToday} dayOffset={0} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('false');
    });

    it('should show "In future" for future dates', async () => {
      // Value is 25 hours from now — on tomorrow's local date.
      const now = new Date();
      const tomorrowMorning = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      render(<TestWrapper value={tomorrowMorning} dayOffset={1} />);

      const isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('true');
    });

    it('should update "In future" when dayOffset changes', async () => {
      // Start with a time 30 min in the future (today, dayOffset=0 → in future)
      const now = new Date();
      const futureTime = new Date(now.getTime() + 30 * 60 * 1000);

      render(<TestWrapper value={futureTime} dayOffset={0} />);

      let isInFuture = await waitForElement('is-in-future');

      expect(isInFuture).toHaveTextContent('true');

      // Click button to change offset to -1 (yesterday → moves to past)
      await page.getByTestId('change-offset-btn').click();

      // Wait for state update
      await vi.waitFor(async () => {
        isInFuture = await waitForElement('is-in-future');

        expect(isInFuture).toHaveTextContent('false');
      });
    });

    it('should handle edge case: exact current time', async () => {
      // Exactly the mocked current time
      const exactCurrentTime = new Date();

      render(<TestWrapper value={exactCurrentTime} dayOffset={0} />);

      const isInFuture = await waitForElement('is-in-future');

      // displayDate <= currentTime → NOT in future
      expect(isInFuture).toHaveTextContent('false');
    });
  });

  describe('Date Calculation', () => {
    it('should calculate displayDate correctly with positive dayOffset', async () => {
      // Use a value 2 hours from now so it stays on today's local date
      const now = new Date();
      const baseTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      render(<TestWrapper value={baseTime} dayOffset={1} />);

      const displayDate = await waitForElement('display-date');
      const displayDateValue = new Date(displayDate.textContent!);

      // Expected: today midnight + 1 day, preserving baseTime's local hours/minutes
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const expected = new Date(todayMidnight);
      expected.setDate(expected.getDate() + 1);
      expected.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);

      expect(displayDateValue.getTime()).toBe(expected.getTime());
    });

    it('should calculate displayDate correctly with negative dayOffset', async () => {
      const now = new Date();
      const baseTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      render(<TestWrapper value={baseTime} dayOffset={-2} />);

      const displayDate = await waitForElement('display-date');
      const displayDateValue = new Date(displayDate.textContent!);

      // Expected: today midnight - 2 days, preserving baseTime's local hours/minutes
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const expected = new Date(todayMidnight);
      expected.setDate(expected.getDate() - 2);
      expected.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0);

      expect(displayDateValue.getTime()).toBe(expected.getTime());
    });

    it('should preserve time from value in displayDate', async () => {
      // Value 1 hour ago — on today's local date
      const now = new Date();
      const baseTime = new Date(now.getTime() - 60 * 60 * 1000);

      render(<TestWrapper value={baseTime} dayOffset={0} />);

      const displayDate = await waitForElement('display-date');
      const displayDateValue = new Date(displayDate.textContent!);

      // Local hours and minutes should match the value
      expect(displayDateValue.getHours()).toBe(baseTime.getHours());
      expect(displayDateValue.getMinutes()).toBe(baseTime.getMinutes());
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
      // Start with a value 2 hours ago, offset -1 → displayDate is clearly in the past
      const now = new Date();
      const pastTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      render(<TestWrapper value={pastTime} dayOffset={-1} />);

      // Verify initial displayDate differs from currentTime by more than 1 day
      let displayDate = await waitForElement('display-date');
      let displayDateValue = new Date(displayDate.textContent!);
      const initialCurrentTime = await waitForElement('current-time');
      const initialCurrentTimeValue = new Date(initialCurrentTime.textContent!);

      expect(Math.abs(displayDateValue.getTime() - initialCurrentTimeValue.getTime())).toBeGreaterThan(60_000);

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
      const now = new Date();
      const pastTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      render(<TestWrapper value={pastTime} dayOffset={-1} />);

      await page.getByTestId('reset-btn').click();

      // After reset, displayDate should be ≈ currentTime (dayOffset=0, value=now)
      await vi.waitFor(async () => {
        const displayDate = await waitForElement('display-date');
        const currentTime = await waitForElement('current-time');
        const displayDateValue = new Date(displayDate.textContent!);
        const currentTimeValue = new Date(currentTime.textContent!);

        const timeDiff = Math.abs(displayDateValue.getTime() - currentTimeValue.getTime());
        expect(timeDiff).toBeLessThan(1000);
      });
    });
  });
});
