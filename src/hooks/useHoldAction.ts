import { useRef, useEffect, useCallback } from 'react';

interface UseHoldActionOptions {
  /**
   * Callback function to execute on hold
   */
  onAction: () => void;
  /**
   * Interval in milliseconds between repeated actions while holding
   * @default 100 (10 times per second)
   */
  intervalMs?: number;
  /**
   * Delay in milliseconds before starting repeated actions
   * @default 1500 (1.5 seconds)
   */
  delayMs?: number;
}

interface HoldActionHandlers {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}

/**
 * Custom hook for handling press-and-hold actions
 *
 * @example
 * ```tsx
 * const holdHandlers = useHoldAction({
 *   onAction: () => setCount(prev => prev + 1),
 *   intervalMs: 100,
 *   delayMs: 1500
 * });
 *
 * return (
 *   <button {...holdHandlers}>
 *     Hold me
 *   </button>
 * );
 * ```
 */
export function useHoldAction({
  onAction,
  intervalMs = 100,
  delayMs = 1500,
}: UseHoldActionOptions): HoldActionHandlers {
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopHold = useCallback(() => {
    // Clear delay timeout
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }

    // Clear repeat interval
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const startHold = useCallback(() => {
    // Execute action immediately on press
    onAction();

    // Clear any existing timers
    stopHold();

    // Start delay before repeating
    delayTimeoutRef.current = setTimeout(() => {
      // After delay, start interval for repeated actions
      holdIntervalRef.current = setInterval(() => {
        onAction();
      }, intervalMs);
    }, delayMs);
  }, [onAction, intervalMs, delayMs, stopHold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHold();
    };
  }, [stopHold]);

  return {
    onMouseDown: startHold,
    onMouseUp: stopHold,
    onMouseLeave: stopHold,
    onTouchStart: startHold,
    onTouchEnd: stopHold,
  };
}
