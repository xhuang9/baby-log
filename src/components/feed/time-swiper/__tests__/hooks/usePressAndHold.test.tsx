import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useState } from 'react';
import { usePressAndHold } from '../../hooks/usePressAndHold';
import { advanceTime } from '../test-utils';

/**
 * Test wrapper for the press-and-hold hook
 */
function TestWrapper() {
  const [totalAdjustment, setTotalAdjustment] = useState(0);
  const [currentTier, setCurrentTier] = useState(0);

  const { startHold, stopHold } = usePressAndHold({
    onAdjust: (minutes) => {
      setTotalAdjustment((prev) => prev + minutes);
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Acceleration Tiers', () => {
    it('should start at tier 0 (1 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Initial adjustment
      advanceTime(300); // Wait for first interval

      const adjustment = await page.getByTestId('total-adjustment').element();
      const tier = await page.getByTestId('current-tier').element();

      expect(tier.textContent).toBe('0');
      expect(parseInt(adjustment.textContent!)).toBe(1); // 1 minute

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 1 after 600ms (5 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 1
      advanceTime(700); // > 600ms

      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('1');
      });

      // Next adjustment should be 5 minutes
      advanceTime(300);

      await vi.waitFor(async () => {
        const adjustment = await page.getByTestId('total-adjustment').element();
        const total = parseInt(adjustment.textContent!);
        expect(total).toBeGreaterThanOrEqual(5);
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 2 after 1500ms (15 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 2
      advanceTime(1600); // > 1500ms

      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('2');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 3 after 3000ms (30 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 3
      advanceTime(3100); // > 3000ms

      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('3');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should progress to tier 4 after 5000ms (60 min increments)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Progress to tier 4
      advanceTime(5100); // > 5000ms

      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
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

      const testBtn = await page.getByTestId('test-btn').element();
      testBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Tier 0: 1 min
      advanceTime(300);
      expect(onAdjust).toHaveBeenCalledWith(1);

      // Progress to tier 1: 5 min
      advanceTime(400); // Total 700ms
      advanceTime(300);
      expect(onAdjust).toHaveBeenCalledWith(5);

      // Progress to tier 2: 15 min
      advanceTime(900); // Total 1600ms
      advanceTime(300);
      expect(onAdjust).toHaveBeenCalledWith(15);

      testBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should handle minus direction with negative values', async () => {
      render(<TestWrapper />);

      const minusBtn = await page.getByTestId('minus-btn').element();
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      advanceTime(300);

      await vi.waitFor(async () => {
        const adjustment = await page.getByTestId('total-adjustment').element();
        expect(parseInt(adjustment.textContent!)).toBe(-1); // -1 minute
      });

      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });

  describe('Smart Resume Logic', () => {
    it('should resume at previous tier if released within 1500ms (same direction)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();

      // First press: get to tier 2
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      advanceTime(1600); // Reach tier 2
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Release for less than 1500ms
      advanceTime(1000);

      // Second press (same direction)
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should resume at tier 2
      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('2');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should drop one tier if reversing direction', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      const minusBtn = await page.getByTestId('minus-btn').element();

      // First press: get to tier 3
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      advanceTime(3100); // Reach tier 3
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Quick release
      advanceTime(500);

      // Press in opposite direction
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should drop to tier 2 (3 - 1)
      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('2');
      });

      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should reset to tier 0 if resume window expired (>1500ms)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();

      // First press: get to tier 2
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      advanceTime(1600);
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Wait longer than resume window
      advanceTime(2000); // > 1500ms

      // Second press
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should reset to tier 0
      advanceTime(100);
      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('0');
      });

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    it('should not go below tier 0 when dropping tier on reversal', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      const minusBtn = await page.getByTestId('minus-btn').element();

      // Start at tier 0
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      advanceTime(300);
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      advanceTime(500);

      // Reverse direction
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      // Should stay at tier 0 (can't go negative)
      await vi.waitFor(async () => {
        const tier = await page.getByTestId('current-tier').element();
        expect(tier.textContent).toBe('0');
      });

      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on stopHold', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      advanceTime(300);

      const adjustmentBefore = await page.getByTestId('total-adjustment').element();
      const valueBefore = parseInt(adjustmentBefore.textContent!);

      // Stop holding
      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

      // Advance time significantly
      advanceTime(1000);

      // Adjustment should not change
      const adjustmentAfter = await page.getByTestId('total-adjustment').element();
      expect(parseInt(adjustmentAfter.textContent!)).toBe(valueBefore);
    });

    it('should clear interval on pointerleave', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      advanceTime(300);

      const adjustmentBefore = await page.getByTestId('total-adjustment').element();
      const valueBefore = parseInt(adjustmentBefore.textContent!);

      // Simulate pointer leave
      plusBtn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

      // Advance time
      advanceTime(1000);

      // Adjustment should not change
      const adjustmentAfter = await page.getByTestId('total-adjustment').element();
      expect(parseInt(adjustmentAfter.textContent!)).toBe(valueBefore);
    });

    it('should clear interval on unmount', async () => {
      const { unmount } = render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

      advanceTime(300);

      // Unmount component
      unmount();

      // Advance time - should not throw errors
      expect(() => advanceTime(1000)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid press/release cycles', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();

      // Rapid presses
      for (let i = 0; i < 5; i++) {
        plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        advanceTime(100);
        plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        advanceTime(100);
      }

      // Should accumulate adjustments
      const adjustment = await page.getByTestId('total-adjustment').element();
      expect(parseInt(adjustment.textContent!)).toBeGreaterThan(0);
    });

    it('should handle simultaneous plus and minus (last wins)', async () => {
      render(<TestWrapper />);

      const plusBtn = await page.getByTestId('plus-btn').element();
      const minusBtn = await page.getByTestId('minus-btn').element();

      // Press plus
      plusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      advanceTime(300);

      // Press minus (should override)
      minusBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      advanceTime(300);

      // Should have both positive and negative adjustments
      const adjustment = await page.getByTestId('total-adjustment').element();
      const total = parseInt(adjustment.textContent!);
      expect(Math.abs(total)).toBeGreaterThan(0);

      plusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      minusBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
  });
});
