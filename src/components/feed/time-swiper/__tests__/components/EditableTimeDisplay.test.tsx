import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { useState } from 'react';
import { EditableTimeDisplay } from '../../components/EditableTimeDisplay';

/**
 * Test wrapper component
 */
function TestWrapper({
  initialTime,
  use24Hour = false,
  dimmed = false,
}: {
  initialTime: Date;
  use24Hour?: boolean;
  dimmed?: boolean;
}) {
  const [time, setTime] = useState(initialTime);

  return (
    <div>
      <EditableTimeDisplay
        value={time}
        onChange={setTime}
        use24Hour={use24Hour}
        dimmed={dimmed}
      />
      <div data-testid="time-value">{time.toISOString()}</div>
    </div>
  );
}

describe('EditableTimeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:30:00Z'));
  });

  describe('Display Mode', () => {
    it('should render formatted time in 24h format', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').query();
      expect(display).toBeTruthy();

      if (display) {
        const element = await display.element();
        expect(element.textContent).toContain('14:30');
      }
    });

    it('should render formatted time in 12h format with AM/PM', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={false} />);

      const display = await page.getByTestId('time-display').query();
      expect(display).toBeTruthy();

      if (display) {
        const element = await display.element();
        expect(element.textContent).toMatch(/2:30.*PM/);
      }
    });

    it('should apply dimmed style when dimmed=true', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} dimmed={true} />);

      const display = await page.getByTestId('time-display').query();
      expect(display).toBeTruthy();

      if (display) {
        const element = await display.element();
        expect(element.className).toContain('opacity-50');
      }
    });

    it('should NOT apply dimmed style when dimmed=false', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} dimmed={false} />);

      const display = await page.getByTestId('time-display').query();
      expect(display).toBeTruthy();

      if (display) {
        const element = await display.element();
        expect(element.className).not.toContain('opacity-50');
      }
    });

    it('should enter edit mode on click', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      // Input should appear
      await vi.waitFor(async () => {
        const input = await page.getByTestId('time-input').query();
        expect(input).toBeTruthy();
      });
    });
  });

  describe('Edit Mode', () => {
    it('should show input with current time value', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      expect(input.value).toBe('14:30');
    });

    it('should focus and select input text when entering edit mode', async () => {
      const testTime = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialTime={testTime} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      await vi.waitFor(async () => {
        const input = await page.getByTestId('time-input').element();
        expect(document.activeElement).toBe(input);
      });
    });
  });

  describe('Time Parsing - 24h Format', () => {
    it('should parse "14:30" correctly', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '14:30');
      await userEvent.keyboard('{Enter}');

      // Time should update
      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(14);
        expect(newTime.getUTCMinutes()).toBe(30);
      });
    });

    it('should parse "9:05" correctly (single-digit hour)', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '9:05');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(9);
        expect(newTime.getUTCMinutes()).toBe(5);
      });
    });

    it('should reject "25:00" (invalid hour)', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '25:00');
      await userEvent.keyboard('{Enter}');

      // Time should NOT update (revert to original)
      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(10); // Original hour
      });
    });

    it('should reject "14:60" (invalid minute)', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '14:60');
      await userEvent.keyboard('{Enter}');

      // Time should NOT update
      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(10); // Original
      });
    });
  });

  describe('Time Parsing - 12h Format', () => {
    it('should parse "2:30 PM" correctly', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={false} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '2:30 PM');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(14); // 2 PM = 14:00
        expect(newTime.getUTCMinutes()).toBe(30);
      });
    });

    it('should parse "12:00 AM" as midnight', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={false} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '12:00 AM');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(0); // Midnight
      });
    });

    it('should parse "12:00 PM" as noon', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={false} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '12:00 PM');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(12); // Noon
      });
    });

    it('should handle case-insensitive AM/PM', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={false} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '3:45 pm');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(15); // 3 PM
        expect(newTime.getUTCMinutes()).toBe(45);
      });
    });

    it('should reject "13:00 PM" (invalid 12h hour)', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={false} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '13:00 PM');
      await userEvent.keyboard('{Enter}');

      // Time should NOT update
      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(10); // Original
      });
    });
  });

  describe('Blur/Submit Behavior', () => {
    it('should apply valid time on blur', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '16:45');

      // Trigger blur
      input.blur();

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(16);
        expect(newTime.getUTCMinutes()).toBe(45);
      });
    });

    it('should apply valid time on Enter key', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '16:45');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(16);
        expect(newTime.getUTCMinutes()).toBe(45);
      });
    });

    it('should cancel on Escape key', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '16:45');
      await userEvent.keyboard('{Escape}');

      // Should exit edit mode without changing time
      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(10); // Original time
      });

      // Should return to display mode
      const inputAfter = await page.getByTestId('time-input').query();
      expect(inputAfter).toBeNull();
    });

    it('should NOT apply invalid time (reverts to previous value)', async () => {
      const testTime = new Date('2024-06-15T10:30:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, 'invalid');
      await userEvent.keyboard('{Enter}');

      // Time should revert
      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(10);
        expect(newTime.getUTCMinutes()).toBe(30);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight (00:00) in 24h format', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '00:00');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(0);
      });
    });

    it('should handle end of day (23:59) in 24h format', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '23:59');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(23);
        expect(newTime.getUTCMinutes()).toBe(59);
      });
    });

    it('should handle whitespace in input', async () => {
      const testTime = new Date('2024-06-15T10:00:00Z');

      render(<TestWrapper initialTime={testTime} use24Hour={true} />);

      const display = await page.getByTestId('time-display').element();
      await display.click();

      const input = await page.getByTestId('time-input').element();
      await userEvent.clear(input);
      await userEvent.type(input, '  14:30  ');
      await userEvent.keyboard('{Enter}');

      await vi.waitFor(async () => {
        const timeValue = await page.getByTestId('time-value').element();
        const newTime = new Date(timeValue.textContent!);
        expect(newTime.getUTCHours()).toBe(14);
        expect(newTime.getUTCMinutes()).toBe(30);
      });
    });
  });
});
