import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DAY_WIDTH,
  FUTURE_DAYS_LIMIT_PAST,
  FUTURE_DAYS_LIMIT_TODAY,
  getTimeInHours,
  PAST_DAYS_LIMIT,
  pixelsToHours,
} from '../types';

type UseTimelinePositionParams = {
  value: Date;
  swipeSpeed: number;
  magneticFeel: boolean;
  isToday: boolean;
  onChange: (date: Date) => void;
  onDayOffsetChange?: (dayOffset: number) => void;
  onBoundaryReached?: (direction: 'past' | 'future') => void;
  stopAnimation: () => void;
  startAnimation: (velocity: number) => void;
  animationRef: React.MutableRefObject<number | null>;
};

/**
 * Hook to manage timeline position and pointer interactions.
 * Uses bounded ranges instead of infinite epoch-based approach.
 */
export function useTimelinePosition({
  value,
  swipeSpeed,
  magneticFeel,
  isToday,
  onChange,
  onDayOffsetChange,
  onBoundaryReached,
  stopAnimation,
  startAnimation,
  animationRef,
}: UseTimelinePositionParams) {
  // offset = 0 means value is at center
  // positive offset = swiped to earlier times (past)
  // negative offset = swiped to later times (future)
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastReportedDayOffsetRef = useRef(0);
  // Track the last value we sent via onChange to avoid resetting after our own updates
  const lastSentValueRef = useRef<Date | null>(null);

  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const onChangeRef = useRef(onChange);
  const onDayOffsetChangeRef = useRef(onDayOffsetChange);
  const onBoundaryReachedRef = useRef(onBoundaryReached);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onDayOffsetChangeRef.current = onDayOffsetChange;
  }, [onDayOffsetChange]);

  useEffect(() => {
    onBoundaryReachedRef.current = onBoundaryReached;
  }, [onBoundaryReached]);

  // Calculate boundaries based on isToday
  const futureDaysLimit = isToday ? FUTURE_DAYS_LIMIT_TODAY : FUTURE_DAYS_LIMIT_PAST;
  const minOffset = -futureDaysLimit * DAY_WIDTH; // future limit (negative = future)
  const maxOffset = PAST_DAYS_LIMIT * DAY_WIDTH; // past limit (positive = past)

  // Calculate day offset from current offset position
  const calculateDayOffset = useCallback((currentOffset: number): number => {
    return Math.round(currentOffset / DAY_WIDTH);
  }, []);

  // Clamp offset to boundaries
  const clampOffset = useCallback((off: number): number => {
    return Math.max(minOffset, Math.min(maxOffset, off));
  }, [minOffset, maxOffset]);

  // Report day offset changes to parent
  const reportDayOffsetIfChanged = useCallback((currentOffset: number) => {
    const dayOffset = calculateDayOffset(currentOffset);
    if (dayOffset !== lastReportedDayOffsetRef.current) {
      lastReportedDayOffsetRef.current = dayOffset;
      onDayOffsetChangeRef.current?.(dayOffset);
    }
  }, [calculateDayOffset]);

  // Convert offset to date
  const offsetToDate = useCallback((currentOffset: number): Date => {
    // Get current time from value
    const baseTimeHours = getTimeInHours(value);

    // Calculate total hours offset
    const hoursOffset = pixelsToHours(currentOffset);

    // Calculate new time (can wrap to different days)
    let newTimeHours = baseTimeHours + hoursOffset;

    // Calculate day offset
    const dayOffset = Math.floor(newTimeHours / 24);
    newTimeHours = newTimeHours - dayOffset * 24;

    // Handle negative time (went before midnight)
    if (newTimeHours < 0) {
      newTimeHours += 24;
    }

    // Create new date
    const result = new Date(value);
    result.setDate(result.getDate() - dayOffset);
    result.setHours(Math.floor(newTimeHours), Math.round((newTimeHours % 1) * 60), 0, 0);

    return result;
  }, [value]);

  // Reset offset when value changes externally (not from our own onChange)
  useEffect(() => {
    // Skip if currently dragging or animating
    if (isDraggingRef.current || animationRef.current) {
      return;
    }

    // Skip if this value change came from our own onChange
    if (lastSentValueRef.current && value.getTime() === lastSentValueRef.current.getTime()) {
      lastSentValueRef.current = null; // Clear for next external change
      return;
    }

    // External value change - reset offset
    offsetRef.current = 0;
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect, react-hooks/set-state-in-effect
    setOffset(0);
    lastReportedDayOffsetRef.current = 0;
    onDayOffsetChangeRef.current?.(0);
  }, [value, animationRef]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    stopAnimation();

    isDraggingRef.current = true;
    setIsDragging(true);
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [stopAnimation]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    const currentX = e.clientX;
    const currentTimeMs = performance.now();
    const deltaX = (lastXRef.current - currentX) * swipeSpeed;
    const deltaTime = currentTimeMs - lastTimeRef.current;

    if (deltaTime > 0) {
      const instantVelocity = (deltaX / deltaTime) * 16;
      velocityRef.current = velocityRef.current * 0.6 + instantVelocity * 0.4;
    }

    const newOffset = clampOffset(offsetRef.current + deltaX);

    // Check if hit boundary
    if (newOffset === minOffset && deltaX < 0) {
      onBoundaryReachedRef.current?.('future');
    } else if (newOffset === maxOffset && deltaX > 0) {
      onBoundaryReachedRef.current?.('past');
    }

    offsetRef.current = newOffset;
    setOffset(newOffset);
    reportDayOffsetIfChanged(newOffset);

    lastXRef.current = currentX;
    lastTimeRef.current = currentTimeMs;
  }, [swipeSpeed, clampOffset, minOffset, maxOffset, reportDayOffsetIfChanged]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const minVelocity = magneticFeel ? 0.5 : 0.2;

    if (Math.abs(velocityRef.current) > minVelocity) {
      startAnimation(velocityRef.current);
    } else {
      // No momentum - compute final date and call onChange
      requestAnimationFrame(() => {
        const finalDate = offsetToDate(offsetRef.current);
        lastSentValueRef.current = finalDate;
        onChangeRef.current(finalDate);
      });
    }
  }, [magneticFeel, startAnimation, offsetToDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      velocityRef.current = 0;
    };
  }, []);

  return {
    offset,
    setOffset,
    offsetRef,
    velocityRef,
    isDragging,
    onChangeRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clampOffset,
    offsetToDate,
    minOffset,
    maxOffset,
    reportDayOffsetIfChanged,
    lastSentValueRef,
  };
}
