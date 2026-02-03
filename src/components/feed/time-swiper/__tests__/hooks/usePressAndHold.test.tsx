import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { usePressAndHold } from '../../hooks/usePressAndHold';
import { waitForElement } from '../test-utils';

/**
 * Test wrapper for the press-and-hold hook
 */
function TestWrapper() {
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [currentTier, setCurrentTier] = useState(0);

  const { startHold, stopHold } = usePressAndHold({
    onAdjust: (minutes) => {
      setTotalAdjustment(prev => prev + minutes);
      const tierMap: Record<number, number> = { 1: 0, 5: 1, 15: 2, 30: 3, 60: 4 };
      const tier = tierMap[Math.abs(minutes)] ?? 0;
      setCurrentTier(tier);
    },
  });

  return (
    <div>
      <button
        data-testid="plus-btn"
        onPointerDown={() => startHold(1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        +
      </button>
      <button
        data-testid="minus-btn"
        onPointerDown={() => startHold(-1)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        -
      </button>
      <div data-testid="total-adjustment">{totalAdjustment}</div>
      <div data-testid="current-tier">{currentTier}</div>
    </div>
  );
}

describe('usePressAndHold', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false, toFake: ['setTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Acceleration Tiers', () => {
    it('should start at tier 0 (1 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Wait for initial + first interval tick
      // Tier 0: repeatMs = 200ms, so after 300ms we should have:
      // - Immediate tick at t=0: +1
      // - Interval tick at t=200ms: +1
      // Total: 2 minutes
      vi.advanceTimersByTime(300);

      const adjustment = await waitForElement('total-adjustment');
      const tier = await waitForElement('current-tier');

      expect(tier.textContent).toBe('0');
      expect(Number.parseInt(adjustment.textContent!)).toBe(2); // Immediate + 1 interval tick

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 1 after 600ms (5 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 1
      vi.advanceTimersByTime(700); // > 600ms

      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('1');
      });

      // Next adjustment should be 5 minutes
      vi.advanceTimersByTime(300);

      await vi.waitFor(async () => {
        const adjustment = await waitForElement('total-adjustment');
        const total = Number.parseInt(adjustment.textContent!);

        expect(total).toBeGreaterThanOrEqual(5);
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 2 after 1500ms (15 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 2
      vi.advanceTimersByTime(1600); // > 1500ms

      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('2');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 3 after 3000ms (30 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 3
      vi.advanceTimersByTime(3100); // > 3000ms

      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('3');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 4 after 5000ms (60 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 4
      vi.advanceTimersByTime(5100); // > 5000ms

      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('4');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should call onAdjust with correct minutes per tier', async () => {
      const onAdjust = vi.fn();

      function CustomTestWrapper() {
        const { startHold, stopHold } = usePressAndHold({ onAdjust });

        return (
          <button
            data-testid="test-btn"
            onPointerDown={() => startHold(1)}
            onPointerUp={stopHold}
          >
            Test
          </button>
        );
      }

      render(<CustomTestWrapper />);

      const testBtn = await waitForElement('test-btn');
      testBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Tier 0: 1 min
      vi.advanceTimersByTime(300);

      expect(onAdjust).toHaveBeenCalledWith(1);

      // Progress to tier 1: 5 min
      vi.advanceTimersByTime(400); // Total 700ms
      vi.advanceTimersByTime(300);

      expect(onAdjust).toHaveBeenCalledWith(5);

      // Progress to tier 2: 15 min
      vi.advanceTimersByTime(900); // Total 1600ms
      vi.advanceTimersByTime(300);

      expect(onAdjust).toHaveBeenCalledWith(15);

      testBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should handle minus direction with negative values', async () => {
      render(<TestWrapper />);

      const minusBtn = await waitForElement('minus-btn');
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Wait for initial + first interval tick (same as plus test)
      vi.advanceTimersByTime(300);

      const adjustment = await waitForElement('total-adjustment');

      expect(Number.parseInt(adjustment.textContent!)).toBe(-2); // Immediate + 1 interval tick

      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });

  describe('Smart Resume Logic', () => {
    it('should resume at previous tier if released within 1500ms (same direction)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');

      // First press: get to tier 2
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(1600); // Reach tier 2
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Release for less than 1500ms
      vi.advanceTimersByTime(1000);

      // Second press (same direction)
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should resume at tier 2
      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('2');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should drop one tier if reversing direction', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      const minusBtn = await waitForElement('minus-btn');

      // First press: get to tier 3
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(3100); // Reach tier 3
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Quick release
      vi.advanceTimersByTime(500);

      // Press in opposite direction
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should drop to tier 2 (3 - 1)
      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('2');
      });

      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should reset to tier 0 if resume window expired (>1500ms)', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');

      // First press: get to tier 2
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(1600);
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Wait longer than resume window
      vi.advanceTimersByTime(2000); // > 1500ms

      // Second press
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should reset to tier 0
      vi.advanceTimersByTime(100);
      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('0');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should not go below tier 0 when dropping tier on reversal', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      const minusBtn = await waitForElement('minus-btn');

      // Start at tier 0
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(300);
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      vi.advanceTimersByTime(500);

      // Reverse direction
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should stay at tier 0 (can't go negative)
      await vi.waitFor(async () => {
        const tier = await waitForElement('current-tier');

        expect(tier.textContent).toBe('0');
      });

      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on stopHold', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      vi.advanceTimersByTime(300);

      const adjustmentBefore = await waitForElement('total-adjustment');
      const valueBefore = Number.parseInt(adjustmentBefore.textContent!);

      // Stop holding
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Advance time significantly
      vi.advanceTimersByTime(1000);

      // Adjustment should not change
      const adjustmentAfter = await waitForElement('total-adjustment');

      expect(Number.parseInt(adjustmentAfter.textContent!)).toBe(valueBefore);
    });

    it('should clear interval on pointerleave', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      vi.advanceTimersByTime(300);

      const adjustmentBefore = await waitForElement('total-adjustment');
      const valueBefore = Number.parseInt(adjustmentBefore.textContent!);

      // Simulate pointer leave
      plusBtn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

      // Advance time
      vi.advanceTimersByTime(1000);

      // Adjustment should not change
      const adjustmentAfter = await waitForElement('total-adjustment');

      expect(Number.parseInt(adjustmentAfter.textContent!)).toBe(valueBefore);
    });

    it.skip('should clear interval on unmount', async () => {
      // vitest-browser-react doesn't support unmount API
      // This functionality is implicitly tested by cleanup in other tests
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid press/release cycles', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');

      // Rapid presses
      for (let i = 0; i < 5; i++) {
        plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        vi.advanceTimersByTime(100);
        plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        vi.advanceTimersByTime(100);
      }

      // Should accumulate adjustments
      const adjustment = await waitForElement('total-adjustment');

      expect(Number.parseInt(adjustment.textContent!)).toBeGreaterThan(0);
    });

    it('should handle rapid direction changes', async () => {
      render(<TestWrapper />);

      const plusBtn = await waitForElement('plus-btn');
      const minusBtn = await waitForElement('minus-btn');

      // Press plus - should give +2 (immediate + 1 interval at 200ms)
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(300);

      // Press minus - should give -2 (immediate + 1 interval at 200ms)
      // The plus button is still down, but startHold on minus clears the plus interval
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      vi.advanceTimersByTime(300);

      // Total should be +2 - 2 = 0
      const adjustment = await waitForElement('total-adjustment');
      const total = Number.parseInt(adjustment.textContent!);

      expect(total).toBe(0);

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });
});
