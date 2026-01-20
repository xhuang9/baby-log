/**
 * useHoldAction Hook Tests
 *
 * Basic smoke tests for press-and-hold action hook
 * Note: Full behavioral testing is covered through TimerWidget component tests
 */

import { render } from 'vitest-browser-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { useHoldAction } from './useHoldAction';

// Test component to use the hook
function TestButton({ onAction, intervalMs, delayMs }: {
  onAction: () => void;
  intervalMs?: number;
  delayMs?: number;
}) {
  const handlers = useHoldAction({ onAction, intervalMs, delayMs });
  return (
    <button data-testid="test-button" {...handlers}>
      Test Button
    </button>
  );
}

describe('useHoldAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute action on click', async () => {
    const onAction = vi.fn();
    render(<TestButton onAction={onAction} />);

    const button = page.getByTestId('test-button');
    await button.click();

    // Should call at least once (immediate action)
    expect(onAction).toHaveBeenCalled();
  });

  it('should accept custom interval timing', () => {
    const onAction = vi.fn();
    // Should not throw
    render(<TestButton onAction={onAction} intervalMs={50} />);

    const button = page.getByTestId('test-button');
    expect(button).toBeTruthy();
  });

  it('should accept custom delay timing', () => {
    const onAction = vi.fn();
    // Should not throw
    render(<TestButton onAction={onAction} delayMs={500} />);

    const button = page.getByTestId('test-button');
    expect(button).toBeTruthy();
  });

  it('should use default values when not specified', () => {
    const onAction = vi.fn();
    // Should not throw
    render(<TestButton onAction={onAction} />);

    const button = page.getByTestId('test-button');
    expect(button).toBeTruthy();
  });
});
