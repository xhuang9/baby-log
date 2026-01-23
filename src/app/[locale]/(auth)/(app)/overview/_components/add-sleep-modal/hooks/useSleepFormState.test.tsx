import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useSleepFormState } from './useSleepFormState';

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
        data-testid="set-manual"
        onClick={() => actions.setInputMode('manual')}
      >
        Set Manual
      </button>
      <button
        data-testid="set-left-hand"
        onClick={() => actions.setHandMode('left')}
      >
        Set Left Hand
      </button>
      <button
        data-testid="set-start-time"
        onClick={() => actions.setStartTime(new Date('2024-01-15T08:00:00Z'))}
      >
        Set Start Time
      </button>
      <button
        data-testid="set-end-time"
        onClick={() => actions.setEndTime(new Date('2024-01-15T12:00:00Z'))}
      >
        Set End Time
      </button>
      <button data-testid="reset" onClick={() => actions.resetForm()}>
        Reset
      </button>
    </div>
  );
}

describe('useSleepFormState', () => {
  it('should initialize with default values', async () => {
    render(<TestWrapper />);

    expect(await page.getByTestId('input-mode').element()).toHaveTextContent(
      'timer',
    );
    expect(await page.getByTestId('hand-mode').element()).toHaveTextContent(
      'right',
    );
    expect(await page.getByTestId('duration').element()).toHaveTextContent(
      '60',
    );
  });

  it('should update input mode', async () => {
    render(<TestWrapper />);

    await page.getByTestId('set-manual').click();

    expect(await page.getByTestId('input-mode').element()).toHaveTextContent(
      'manual',
    );
  });

  it('should update hand mode', async () => {
    render(<TestWrapper />);

    await page.getByTestId('set-left-hand').click();

    expect(await page.getByTestId('hand-mode').element()).toHaveTextContent(
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
    expect(await page.getByTestId('input-mode').element()).toHaveTextContent(
      'manual',
    );
    expect(await page.getByTestId('hand-mode').element()).toHaveTextContent(
      'left',
    );

    // Reset form
    await page.getByTestId('reset').click();

    // Verify reset to defaults
    expect(await page.getByTestId('input-mode').element()).toHaveTextContent(
      'timer',
    );
    // Note: handMode is NOT reset by resetForm (it's a user preference)
    expect(await page.getByTestId('hand-mode').element()).toHaveTextContent(
      'left',
    );
    // Duration should be reset to 60 minutes
    expect(await page.getByTestId('duration').element()).toHaveTextContent(
      '60',
    );
  });
});
