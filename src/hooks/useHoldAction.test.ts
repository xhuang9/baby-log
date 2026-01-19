/**
 * useHoldAction Hook Tests
 *
 * Unit tests for press-and-hold action hook
 */

import { renderHook } from 'vitest-browser-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoldAction } from './useHoldAction';

describe('useHoldAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return handler functions', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() => useHoldAction({ onAction }));

      expect(result.current).toHaveProperty('onMouseDown');
      expect(result.current).toHaveProperty('onMouseUp');
      expect(result.current).toHaveProperty('onMouseLeave');
      expect(result.current).toHaveProperty('onTouchStart');
      expect(result.current).toHaveProperty('onTouchEnd');
    });
  });

  describe('single click/press', () => {
    it('should execute action immediately on mouse down', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() => useHoldAction({ onAction }));

      result.current.onMouseDown();

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should execute action immediately on touch start', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() => useHoldAction({ onAction }));

      result.current.onTouchStart();

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should not repeat action if released before delay', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() => useHoldAction({ onAction, delayMs: 1500 }));

      result.current.onMouseDown();
      expect(onAction).toHaveBeenCalledTimes(1);

      // Advance time less than delay
      vi.advanceTimersByTime(1000);
      result.current.onMouseUp();

      // Advance past delay - should not trigger more actions
      vi.advanceTimersByTime(1000);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('hold behavior', () => {
    it('should repeat action after delay when held', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1500, intervalMs: 100 })
      );

      result.current.onMouseDown();
      expect(onAction).toHaveBeenCalledTimes(1);

      // Advance past delay
      vi.advanceTimersByTime(1500);

      // First repeat should happen
      expect(onAction).toHaveBeenCalledTimes(2);

      // Advance by interval - should repeat again
      vi.advanceTimersByTime(100);
      expect(onAction).toHaveBeenCalledTimes(3);

      // Advance by another interval
      vi.advanceTimersByTime(100);
      expect(onAction).toHaveBeenCalledTimes(4);
    });

    it('should stop repeating on mouse up', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1500, intervalMs: 100 })
      );

      result.current.onMouseDown();
      expect(onAction).toHaveBeenCalledTimes(1);

      // Advance past delay and start repeating
      vi.advanceTimersByTime(1500);
      expect(onAction).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(100);
      expect(onAction).toHaveBeenCalledTimes(3);

      // Release
      result.current.onMouseUp();

      // Advance more time - should not trigger more actions
      vi.advanceTimersByTime(1000);
      expect(onAction).toHaveBeenCalledTimes(3);
    });

    it('should stop repeating on mouse leave', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1500, intervalMs: 100 })
      );

      result.current.onMouseDown();
      vi.advanceTimersByTime(1600);
      expect(onAction).toHaveBeenCalledTimes(2);

      // Mouse leaves element
      result.current.onMouseLeave();

      // Advance more time - should not trigger more actions
      vi.advanceTimersByTime(1000);
      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('should stop repeating on touch end', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1500, intervalMs: 100 })
      );

      result.current.onTouchStart();
      vi.advanceTimersByTime(1600);
      expect(onAction).toHaveBeenCalledTimes(2);

      // Touch ends
      result.current.onTouchEnd();

      // Advance more time - should not trigger more actions
      vi.advanceTimersByTime(1000);
      expect(onAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('custom timing', () => {
    it('should respect custom delay', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 500, intervalMs: 100 })
      );

      result.current.onMouseDown();
      expect(onAction).toHaveBeenCalledTimes(1);

      // Advance just before delay
      vi.advanceTimersByTime(400);
      expect(onAction).toHaveBeenCalledTimes(1);

      // Advance past custom delay
      vi.advanceTimersByTime(200);
      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('should respect custom interval', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1000, intervalMs: 50 })
      );

      result.current.onMouseDown();
      vi.advanceTimersByTime(1000);
      expect(onAction).toHaveBeenCalledTimes(2);

      // Should repeat faster with custom interval
      vi.advanceTimersByTime(50);
      expect(onAction).toHaveBeenCalledTimes(3);

      vi.advanceTimersByTime(50);
      expect(onAction).toHaveBeenCalledTimes(4);
    });

    it('should use default values when not specified', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() => useHoldAction({ onAction }));

      result.current.onMouseDown();
      expect(onAction).toHaveBeenCalledTimes(1);

      // Default delay is 1500ms
      vi.advanceTimersByTime(1500);
      expect(onAction).toHaveBeenCalledTimes(2);

      // Default interval is 100ms
      vi.advanceTimersByTime(100);
      expect(onAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('cleanup', () => {
    it('should clear timers on unmount', () => {
      const onAction = vi.fn();
      const { result, unmount } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1500, intervalMs: 100 })
      );

      result.current.onMouseDown();
      vi.advanceTimersByTime(1600);
      expect(onAction).toHaveBeenCalledTimes(2);

      // Unmount should clear timers
      unmount();

      // Advance more time - should not trigger more actions
      vi.advanceTimersByTime(1000);
      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple presses without memory leaks', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1000, intervalMs: 100 })
      );

      // First press
      result.current.onMouseDown();
      vi.advanceTimersByTime(500);
      result.current.onMouseUp();

      // Second press
      result.current.onMouseDown();
      vi.advanceTimersByTime(500);
      result.current.onMouseUp();

      // Third press
      result.current.onMouseDown();
      vi.advanceTimersByTime(500);
      result.current.onMouseUp();

      // Should only call once per press (released before delay)
      expect(onAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid press and release', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1500, intervalMs: 100 })
      );

      result.current.onMouseDown();
      result.current.onMouseUp();
      result.current.onMouseDown();
      result.current.onMouseUp();

      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('should handle press during existing hold', () => {
      const onAction = vi.fn();
      const { result } = renderHook(() =>
        useHoldAction({ onAction, delayMs: 1000, intervalMs: 100 })
      );

      // First press
      result.current.onMouseDown();
      vi.advanceTimersByTime(500);

      // Second press while first is still held (should reset timers)
      result.current.onMouseDown();
      expect(onAction).toHaveBeenCalledTimes(2); // Both immediate actions

      // Advance to where first hold would have repeated
      vi.advanceTimersByTime(600);

      // Should only repeat based on second press timing
      expect(onAction).toHaveBeenCalledTimes(3);
    });
  });
});
