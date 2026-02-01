import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useEffect, useState } from 'react';
import { useTimeSwiperAnimation } from '../../hooks/useTimeSwiperAnimation';
import { setTestTime, setupAnimationFrameMock, simulatePointerDrag } from '../test-utils';

// Mock user store
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
 * Test wrapper for the animation hook
 */
function TestWrapper({
  initialValue,
  swipeSpeed = 1.0,
  swipeResistance = 'default' as const,
  initialDayOffset = 0,
  isToday = true,
}: {
  initialValue: Date;
  swipeSpeed?: number;
  swipeResistance?: 'smooth' | 'default' | 'sticky';
  initialDayOffset?: number;
  isToday?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  const {
    offset,
    dayOffset,
    atBoundary,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    adjustTimeByMinutes,
    setDayOffset,
  } = useTimeSwiperAnimation({
    value,
    onChange: setValue,
    swipeSpeed,
    swipeResistance,
    isToday,
  });

  useEffect(() => {
    setDayOffset(initialDayOffset);
  }, [initialDayOffset, setDayOffset]);

  return (
    <div>
      <div
        data-testid="swiper-area"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ width: '300px', height: '100px', touchAction: 'none' }}
      >
        Swipe Area
      </div>
      <div data-testid="offset">{offset}</div>
      <div data-testid="value">{value.toISOString()}</div>
      <div data-testid="day-offset">{dayOffset}</div>
      <div data-testid="boundary">{atBoundary || 'none'}</div>
      <button
        data-testid="adjust-plus"
        onClick={() => adjustTimeByMinutes(5)} // +5 minutes
      >
        +5
      </button>
      <button
        data-testid="adjust-minus"
        onClick={() => adjustTimeByMinutes(-5)} // -5 minutes
      >
        -5
      </button>
    </div>
  );
}

describe('useTimeSwiperAnimation', () => {
  let triggerNextFrame: (timestamp?: number) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    setTestTime('2024-06-15T14:30:00Z'); // June 15, 2024 at 2:30 PM

    // Setup RAF mock
    const rafMock = setupAnimationFrameMock();
    triggerNextFrame = rafMock.triggerNextFrame;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Pointer Interactions', () => {
    it('should update offset on drag', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Simulate drag
      simulatePointerDrag(swiperArea, 150, 100, 5); // Drag left 50px

      // Offset should be updated (negative = backward in time)
      await vi.waitFor(async () => {
        const offset = await page.getByTestId('offset').element();
        const offsetValue = parseFloat(offset.textContent!);
        expect(offsetValue).toBeLessThan(0);
      });
    });

    it('should calculate velocity during drag', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Quick swipe (high velocity)
      const startTime = performance.now();
      simulatePointerDrag(swiperArea, 150, 50, 3); // Fast drag

      // Advance time to allow momentum animation
      triggerNextFrame(startTime + 16);
      triggerNextFrame(startTime + 32);

      // Offset should continue changing due to momentum
      await vi.waitFor(async () => {
        const offset = await page.getByTestId('offset').element();
        const offsetValue = parseFloat(offset.textContent!);
        expect(Math.abs(offsetValue)).toBeGreaterThan(0);
      });
    });

    it('should call onChange with new date after drag', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const swiperArea = await page.getByTestId('swiper-area').element();
      const initialValueElement = await page.getByTestId('value').element();
      const initialValueText = initialValueElement.textContent!;

      // Drag to change time
      simulatePointerDrag(swiperArea, 150, 100, 5);

      // Value should change
      await vi.waitFor(async () => {
        const valueElement = await page.getByTestId('value').element();
        expect(valueElement.textContent).not.toBe(initialValueText);
      });
    });

    it('should start momentum animation on release with high velocity', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Fast swipe
      simulatePointerDrag(swiperArea, 150, 50, 2);

      const offsetBeforeMomentum = await page.getByTestId('offset').element();
      const offsetBefore = parseFloat(offsetBeforeMomentum.textContent!);

      // Trigger animation frames
      const startTime = performance.now();
      triggerNextFrame(startTime + 16);
      triggerNextFrame(startTime + 32);
      triggerNextFrame(startTime + 48);

      // Offset should continue changing
      await vi.waitFor(async () => {
        const offsetAfter = await page.getByTestId('offset').element();
        const offsetAfterValue = parseFloat(offsetAfter.textContent!);
        expect(Math.abs(offsetAfterValue)).toBeGreaterThan(Math.abs(offsetBefore));
      });
    });

    it('should NOT animate if velocity too low', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Slow drag
      simulatePointerDrag(swiperArea, 150, 145, 10); // Very small movement

      const offsetAfterDrag = await page.getByTestId('offset').element();
      const offsetValue = parseFloat(offsetAfterDrag.textContent!);

      // Trigger animation frames
      const startTime = performance.now();
      triggerNextFrame(startTime + 16);
      triggerNextFrame(startTime + 32);

      // Offset should not change significantly (no momentum)
      await vi.waitFor(async () => {
        const offsetAfterFrames = await page.getByTestId('offset').element();
        const offsetAfterValue = parseFloat(offsetAfterFrames.textContent!);
        expect(Math.abs(offsetAfterValue - offsetValue)).toBeLessThan(1);
      });
    });
  });

  describe('Day Crossing Detection', () => {
    it('should increment dayOffset when crossing midnight forward', async () => {
      // Start at 11:00 PM today
      const lateNight = new Date('2024-06-15T23:00:00Z');

      render(<TestWrapper initialValue={lateNight} />);

      const adjustPlus = await page.getByTestId('adjust-plus').element();

      // Add 5 minutes multiple times to cross midnight
      for (let i = 0; i < 15; i++) {
        await adjustPlus.click();
      }

      // dayOffset should increment
      await vi.waitFor(async () => {
        const dayOffsetElement = await page.getByTestId('day-offset').element();
        const dayOffsetValue = parseInt(dayOffsetElement.textContent!);
        expect(dayOffsetValue).toBe(1);
      });
    });

    it('should decrement dayOffset when crossing midnight backward', async () => {
      // Start at 12:30 AM today
      const earlyMorning = new Date('2024-06-15T00:30:00Z');

      render(<TestWrapper initialValue={earlyMorning} />);

      const adjustMinus = await page.getByTestId('adjust-minus').element();

      // Subtract 5 minutes multiple times to cross midnight
      for (let i = 0; i < 10; i++) {
        await adjustMinus.click();
      }

      // dayOffset should decrement
      await vi.waitFor(async () => {
        const dayOffsetElement = await page.getByTestId('day-offset').element();
        const dayOffsetValue = parseInt(dayOffsetElement.textContent!);
        expect(dayOffsetValue).toBe(-1);
      });
    });

    it('should NOT cross day if at future boundary (dayOffset = 1)', async () => {
      // Start tomorrow (already at max future)
      const tomorrow = new Date('2024-06-16T14:00:00Z');

      render(<TestWrapper initialValue={tomorrow} initialDayOffset={1} />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Try to swipe forward (should hit boundary)
      simulatePointerDrag(swiperArea, 150, 50, 5);

      // dayOffset should stay at 0 (or not increase beyond 1)
      await vi.waitFor(async () => {
        const boundary = await page.getByTestId('boundary').element();
        expect(boundary.textContent).toBe('future');
      });
    });

    it('should NOT cross day if at past boundary (dayOffset = -7)', async () => {
      render(
        <TestWrapper
          initialValue={new Date('2024-06-08T14:30:00Z')}
          initialDayOffset={-7}
        />
      );

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Try to swipe backward (should hit boundary)
      simulatePointerDrag(swiperArea, 150, 250, 5);

      // Should show past boundary
      await vi.waitFor(async () => {
        const boundary = await page.getByTestId('boundary').element();
        expect(boundary.textContent).toBe('past');
      });
    });
  });

  describe('Momentum Animation', () => {
    it('should decelerate smoothly using easeOutCubic', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Fast swipe
      simulatePointerDrag(swiperArea, 150, 50, 2);

      const offsets: number[] = [];

      // Collect offsets over time
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        triggerNextFrame(startTime + i * 16);

        const offsetElement = await page.getByTestId('offset').element();
        offsets.push(Math.abs(parseFloat(offsetElement.textContent!)));
      }

      // Verify deceleration (changes should get smaller)
      const deltas = offsets.slice(1).map((v, i) => v - offsets[i]);
      expect(deltas[deltas.length - 1]).toBeLessThan(deltas[0]);
    });

    it('should stop animation after duration expires', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} swipeResistance="smooth" />);

      const swiperArea = await page.getByTestId('swiper-area').element();

      // Fast swipe
      simulatePointerDrag(swiperArea, 150, 50, 2);

      // Run animation for longer than duration (typically 400-600ms)
      const startTime = performance.now();
      for (let i = 0; i < 40; i++) {
        triggerNextFrame(startTime + i * 16);
      }

      const offsetBefore = await page.getByTestId('offset').element();
      const offsetValue = parseFloat(offsetBefore.textContent!);

      // Trigger more frames
      for (let i = 0; i < 5; i++) {
        triggerNextFrame(startTime + (40 + i) * 16);
      }

      // Offset should not change (animation stopped)
      const offsetAfter = await page.getByTestId('offset').element();
      const offsetAfterValue = parseFloat(offsetAfter.textContent!);
      expect(Math.abs(offsetAfterValue - offsetValue)).toBeLessThan(0.1);
    });

    it('should respect swipeResistance config', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      // Test with 'smooth' resistance
      const { unmount: unmount1 } = render(
        <TestWrapper initialValue={initialValue} swipeResistance="smooth" />
      );

      const swiperArea1 = await page.getByTestId('swiper-area').element();
      simulatePointerDrag(swiperArea1, 150, 100, 5);

      const offset1 = await page.getByTestId('offset').element();
      const smoothOffset = Math.abs(parseFloat(offset1.textContent!));

      unmount1();

      // Test with 'sticky' resistance
      render(<TestWrapper initialValue={initialValue} swipeResistance="sticky" />);

      const swiperArea2 = await page.getByTestId('swiper-area').element();
      simulatePointerDrag(swiperArea2, 150, 100, 5);

      const offset2 = await page.getByTestId('offset').element();
      const stickyOffset = Math.abs(parseFloat(offset2.textContent!));

      // Sticky should have more resistance (smaller offset for same gesture)
      expect(stickyOffset).toBeLessThan(smoothOffset);
    });
  });

  describe('Time Adjustment', () => {
    it('should adjust time by minutes and update offset', async () => {
      const initialValue = new Date('2024-06-15T14:30:00Z');

      render(<TestWrapper initialValue={initialValue} />);

      const adjustPlus = await page.getByTestId('adjust-plus').element();
      await adjustPlus.click();

      // Value should increase by 5 minutes
      await vi.waitFor(async () => {
        const valueElement = await page.getByTestId('value').element();
        const newValue = new Date(valueElement.textContent!);
        expect(newValue.getUTCMinutes()).toBe(35); // 30 + 5
      });
    });

    it('should handle day crossing when adjusting time forward', async () => {
      const lateNight = new Date('2024-06-15T23:58:00Z'); // 11:58 PM

      render(<TestWrapper initialValue={lateNight} />);

      const adjustPlus = await page.getByTestId('adjust-plus').element();
      await adjustPlus.click(); // +5 minutes = 12:03 AM next day

      // dayOffset should increment
      await vi.waitFor(async () => {
        const dayOffsetElement = await page.getByTestId('day-offset').element();
        const dayOffsetValue = parseInt(dayOffsetElement.textContent!);
        expect(dayOffsetValue).toBe(1);
      });
    });

    it('should handle day crossing when adjusting time backward', async () => {
      const earlyMorning = new Date('2024-06-15T00:02:00Z'); // 12:02 AM

      render(<TestWrapper initialValue={earlyMorning} />);

      const adjustMinus = await page.getByTestId('adjust-minus').element();
      await adjustMinus.click(); // -5 minutes = 11:57 PM previous day

      // dayOffset should decrement
      await vi.waitFor(async () => {
        const dayOffsetElement = await page.getByTestId('day-offset').element();
        const dayOffsetValue = parseInt(dayOffsetElement.textContent!);
        expect(dayOffsetValue).toBe(-1);
      });
    });
  });
});
