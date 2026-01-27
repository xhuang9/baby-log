import { useCallback, useEffect, useRef } from 'react';
import { MAX_ANIMATION_DURATION } from '../types';

// Ease-out cubic function for smooth deceleration
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

type UseTimelineAnimationParams = {
  offsetRef: React.MutableRefObject<number>;
  velocityRef: React.MutableRefObject<number>;
  onChangeRef: React.MutableRefObject<(date: Date) => void>;
  magneticFeelRef: React.MutableRefObject<boolean>;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  clampOffset: (offset: number) => number;
  offsetToDate: (offset: number) => Date;
  reportDayOffsetIfChanged: (offset: number) => void;
  lastSentValueRef: React.MutableRefObject<Date | null>;
};

/**
 * Hook to manage momentum animation for the timeline.
 * Uses bounded offsets with clamping at boundaries.
 */
export function useTimelineAnimation({
  offsetRef,
  velocityRef,
  onChangeRef,
  magneticFeelRef,
  setOffset,
  clampOffset,
  offsetToDate,
  reportDayOffsetIfChanged,
  lastSentValueRef,
}: UseTimelineAnimationParams) {
  const animationRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef(0);
  const initialVelocityRef = useRef(0);

  const animateLoopRef = useRef<(() => void) | undefined>(undefined);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Momentum animation loop with ease-out and boundary clamping
  useEffect(() => {
    animateLoopRef.current = () => {
      const elapsed = performance.now() - animationStartTimeRef.current;
      const initialVelocity = initialVelocityRef.current;

      const baseDuration = Math.min(
        Math.abs(initialVelocity) * (magneticFeelRef.current ? 30 : 50),
        MAX_ANIMATION_DURATION,
      );
      const duration = magneticFeelRef.current ? Math.min(baseDuration, 800) : baseDuration;

      if (elapsed >= duration) {
        animationRef.current = null;
        const finalDate = offsetToDate(offsetRef.current);
        lastSentValueRef.current = finalDate;
        onChangeRef.current(finalDate);
        return;
      }

      const progress = elapsed / duration;
      const easedProgress = easeOutCubic(progress);
      const currentVelocityFactor = 1 - easedProgress;
      velocityRef.current = initialVelocity * currentVelocityFactor * 0.3;

      // Apply velocity with boundary clamping
      const newOffset = clampOffset(offsetRef.current + velocityRef.current);

      // If we hit a boundary, stop animation early
      if (newOffset === offsetRef.current && Math.abs(velocityRef.current) > 0.1) {
        animationRef.current = null;
        const finalDate = offsetToDate(newOffset);
        lastSentValueRef.current = finalDate;
        onChangeRef.current(finalDate);
        return;
      }

      offsetRef.current = newOffset;
      setOffset(newOffset);
      reportDayOffsetIfChanged(newOffset);

      animationRef.current = requestAnimationFrame(() => animateLoopRef.current?.());
    };
  }, [offsetRef, velocityRef, onChangeRef, magneticFeelRef, setOffset, clampOffset, offsetToDate, reportDayOffsetIfChanged, lastSentValueRef]);

  const startAnimation = useCallback((velocity: number) => {
    initialVelocityRef.current = velocity;
    animationStartTimeRef.current = performance.now();

    if (animateLoopRef.current) {
      animationRef.current = requestAnimationFrame(animateLoopRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  return {
    animationRef,
    stopAnimation,
    startAnimation,
  };
}
