import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useSleepFormState } from './useSleepFormState';

// Utility to wait for element
async function waitForElement(testId: string) {
  return vi.waitFor(() => page.getByTestId(testId).element(), {
    timeout: 3000,
  });
}

// Test component wrapper
function TestWrapper() {
  const { state, actions } = useSleepFormState();

  return (
    <div>
      <div data-testid="input-mode">{state.inputMode}</div>
      <div data-testid="hand-mode">{state.handMode}</div>
      <div data-testid="start-time">{state.startTime.toISOString()}</div>
      <div data-testid="end-time">{state.endTime.toISOString()}</div>
      <div data-testid="duration">
        {Math.round(
          (state.endTime.getTime() - state.startTime.getTime()) / 60000,
        )}
      </div>
      <button
        type="button"
        data-testid="set-manual"
        onClick={() => actions.setInputMode('manual')}
      >
        Set Manual
      </button>
      <button
        type="button"
        data-testid="set-left-hand"
        onClick={() => actions.setHandMode('left')}
      >
        Set Left Hand
      </button>
      <button
        type="button"
        data-testid="set-start-time"
        onClick={() => actions.setStartTime(new Date('2024-01-15T08:00:00Z'))}
      >
        Set Start Time
      </button>
      <button
        type="button"
        data-testid="set-end-time"
        onClick={() => actions.setEndTime(new Date('2024-01-15T12:00:00Z'))}
      >
        Set End Time
      </button>
      <button type="button" data-testid="reset" onClick={() => actions.resetForm()}>
        Reset
      </button>
    </div>
  );
}

describe('useSleepFormState', () => {
  it('should initialize with default values', async () => {
    render(<TestWrapper />);

    expect(await waitForElement('input-mode')).toHaveTextContent(
      'timer',
    );
    expect(await waitForElement('hand-mode')).toHaveTextContent(
      'right',
    );
    expect(await waitForElement('duration')).toHaveTextContent(
      '60',
    );
  });

  it('should update input mode', async () => {
    render(<TestWrapper />);

    await page.getByTestId('set-manual').click();

    expect(await waitForElement('input-mode')).toHaveTextContent(
      'manual',
    );
  });

  it('should update hand mode', async () => {
    render(<TestWrapper />);

    await page.getByTestId('set-left-hand').click();

    expect(await waitForElement('hand-mode')).toHaveTextContent(
      'left',
    );
  });

  it('should update start time', async () => {
    render(<TestWrapper />);

    await page.getByTestId('set-start-time').click();

    expect(await page.getByTestId('start-time').element()).toHaveTextContent(
      '2024-01-15T08:00:00',
    );
  });

  it('should update end time', async () => {
    render(<TestWrapper />);

    await page.getByTestId('set-end-time').click();

    expect(await page.getByTestId('end-time').element()).toHaveTextContent(
      '2024-01-15T12:00:00',
    );
  });

  it('should reset form to defaults', async () => {
    render(<TestWrapper />);

    // Change some values
    await page.getByTestId('set-manual').click();
    await page.getByTestId('set-left-hand').click();

    // Verify changes
    expect(await waitForElement('input-mode')).toHaveTextContent(
      'manual',
    );
    expect(await waitForElement('hand-mode')).toHaveTextContent(
      'left',
    );

    // Reset form
    await page.getByTestId('reset').click();

    // Verify reset to defaults
    expect(await waitForElement('input-mode')).toHaveTextContent(
      'timer',
    );
    // Note: handMode is NOT reset by resetForm (it's a user preference)
    expect(await waitForElement('hand-mode')).toHaveTextContent(
      'left',
    );
    // Duration should be reset to 60 minutes
    expect(await waitForElement('duration')).toHaveTextContent(
      '60',
    );
  });
});
