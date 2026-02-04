'use client';

import type { SwipeResistance } from '@/components/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FUTURE_DAYS_LIMIT_TODAY, HOUR_WIDTH, MAX_ANIMATION_DURATION, PAST_DAYS_LIMIT, TOTAL_WIDTH } from '../constants';

/**
 * Resistance configuration for each level
 * - durationMult: Higher = longer animation
 * - durationCap: Max duration in ms (null = no cap)
 * - minVelocity: Threshold to trigger momentum animation
 */
const RESISTANCE_CONFIG: Record<SwipeResistance, { durationMult: number; durationCap: number | null; minVelocity: number }> = {
  smooth: { durationMult: 50, durationCap: null, minVelocity: 0.2 },
  default: { durationMult: 40, durationCap: 1000, minVelocity: 0.35 },
  sticky: { durationMult: 30, durationCap: 800, minVelocity: 0.5 },
};

type UseTimeSwiperAnimationProps = {
  value: Date;
  onChange: (date: Date) => void;
  swipeResistance: SwipeResistance;
  swipeSpeed: number;
};

export function useTimeSwiperAnimation({
  value,
  onChange,
  swipeResistance,
  swipeSpeed,
}: UseTimeSwiperAnimationProps) {
  const animationRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef(0);
  const initialVelocityRef = useRef(0);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const dayOffsetRef = useRef(0);

  const [offset, setOffset] = useState(0);

  // Fixed base date for stable calculations (computed once on mount)
  const [fixedBaseDate] = useState(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  });

  const [dayOffset, setDayOffset] = useState(() => {
    const m = new Date(value);
    m.setHours(0, 0, 0, 0);
    const computed = Math.round((m.getTime() - fixedBaseDate.getTime()) / 86_400_000);
    dayOffsetRef.current = computed;
    return computed;
  });
  const [atBoundary, setAtBoundary] = useState<'past' | 'future' | null>(null);

  // Refs for latest values in animation loop
  const onChangeRef = useRef(onChange);
  const swipeResistanceRef = useRef(swipeResistance);

  useEffect(() => {
    onChangeRef.current = onChange;
    swipeResistanceRef.current = swipeResistance;
  }, [onChange, swipeResistance]);

  // Date/offset conversions
  const dateToOffset = useCallback((date: Date): number => {
    const minutes = date.getHours() * 60 + date.getMinutes();
    return (minutes / 60) * HOUR_WIDTH;
  }, []);

  const offsetToDate = useCallback((pixelOffset: number, currentDayOffset: number): Date => {
    let normalizedOffset = pixelOffset % TOTAL_WIDTH;
    if (normalizedOffset < 0) {
      normalizedOffset += TOTAL_WIDTH;
    }

    const totalMinutes = (normalizedOffset / HOUR_WIDTH) * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    const newDate = new Date(fixedBaseDate);
    newDate.setDate(newDate.getDate() + currentDayOffset);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  }, [fixedBaseDate]);

  // Initialize offset from value
  useEffect(() => {
    if (!isDraggingRef.current && !animationRef.current) {
      const newOffset = dateToOffset(value);
      offsetRef.current = newOffset;
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect, react-hooks/set-state-in-effect
      setOffset(newOffset);
    }
  }, [value, dateToOffset]);

  // Sync dayOffset when value changes externally (e.g. swap, duration edit)
  useEffect(() => {
    if (isDraggingRef.current || animationRef.current) return;
    const m = new Date(value);
    m.setHours(0, 0, 0, 0);
    const expected = new Date(fixedBaseDate);
    expected.setDate(expected.getDate() + dayOffsetRef.current);
    if (m.getTime() !== expected.getTime()) {
      const d = Math.round((m.getTime() - fixedBaseDate.getTime()) / 86_400_000);
      dayOffsetRef.current = d;
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect, react-hooks/set-state-in-effect
      setDayOffset(d);
    }
  }, [value, fixedBaseDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      isDraggingRef.current = false;
      velocityRef.current = 0;
    };
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

  const checkDayCrossing = useCallback((_prevOffset: number, newOffset: number) => {
    const futureLimit = FUTURE_DAYS_LIMIT_TODAY;

    // Calculate how many days we've crossed based on raw offset
    let daysCrossed = 0;

    if (newOffset >= TOTAL_WIDTH) {
      // Crossed forward - count how many complete day boundaries we passed
      daysCrossed = Math.floor(newOffset / TOTAL_WIDTH);
    } else if (newOffset < 0) {
      // Crossed backward - count how many complete day boundaries we passed
      // For negative numbers, we need to count how many TOTAL_WIDTH chunks fit
      // e.g., -50 means we crossed back 1 day, -2450 means 2 days back
      daysCrossed = -Math.ceil(Math.abs(newOffset) / TOTAL_WIDTH);
    }

    if (daysCrossed !== 0) {
      const attemptedOffset = dayOffsetRef.current + daysCrossed;

      // Check boundaries BEFORE attempting change
      if (attemptedOffset > futureLimit) {
        setAtBoundary('future');
        setTimeout(() => setAtBoundary(null), 600);
        return; // Don't update dayOffset
      } else if (attemptedOffset < -PAST_DAYS_LIMIT) {
        setAtBoundary('past');
        setTimeout(() => setAtBoundary(null), 600);
        return; // Don't update dayOffset
      }

      // Update day offset
      dayOffsetRef.current = attemptedOffset;
      setDayOffset(attemptedOffset);
      setAtBoundary(null);
    }
  }, []);

  // Animation loop
  const animateLoopRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    animateLoopRef.current = () => {
      const elapsed = performance.now() - animationStartTimeRef.current;
      const initialVelocity = initialVelocityRef.current;
      const config = RESISTANCE_CONFIG[swipeResistanceRef.current];

      const baseDuration = Math.min(
        Math.abs(initialVelocity) * config.durationMult,
        MAX_ANIMATION_DURATION,
      );
      const duration = config.durationCap ? Math.min(baseDuration, config.durationCap) : baseDuration;

      if (elapsed >= duration) {
        animationRef.current = null;
        const finalDate = offsetToDate(offsetRef.current, dayOffsetRef.current);
        onChangeRef.current(finalDate);
        return;
      }

      const progress = elapsed / duration;
      const easedProgress = easeOutCubic(progress);
      const currentVelocityFactor = 1 - easedProgress;
      velocityRef.current = initialVelocity * currentVelocityFactor;

      const prevOffset = offsetRef.current;
      offsetRef.current += velocityRef.current;
      checkDayCrossing(prevOffset, offsetRef.current);
      offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
      setOffset(offsetRef.current);

      const currentDate = offsetToDate(offsetRef.current, dayOffsetRef.current);
      onChangeRef.current(currentDate);

      if (animateLoopRef.current) {
        animationRef.current = requestAnimationFrame(animateLoopRef.current);
      }
    };
  }, [offsetToDate, checkDayCrossing]);

  const startAnimation = useCallback(() => {
    if (animateLoopRef.current) {
      animationRef.current = requestAnimationFrame(animateLoopRef.current);
    }
  }, []);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    stopAnimation();
    isDraggingRef.current = true;
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
    const now = performance.now();
    const deltaX = (lastXRef.current - currentX) * swipeSpeed;
    const deltaTime = now - lastTimeRef.current;

    if (deltaTime > 0) {
      const instantVelocity = (deltaX / deltaTime) * 16;
      velocityRef.current = velocityRef.current * 0.6 + instantVelocity * 0.4;
    }

    const prevOffset = offsetRef.current;
    offsetRef.current += deltaX;
    checkDayCrossing(prevOffset, offsetRef.current);
    offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
    setOffset(offsetRef.current);

    const newDate = offsetToDate(offsetRef.current, dayOffsetRef.current);
    onChangeRef.current(newDate);

    lastXRef.current = currentX;
    lastTimeRef.current = now;
  }, [swipeSpeed, offsetToDate, checkDayCrossing]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    initialVelocityRef.current = velocityRef.current;
    animationStartTimeRef.current = performance.now();

    const config = RESISTANCE_CONFIG[swipeResistanceRef.current];
    if (Math.abs(velocityRef.current) > config.minVelocity) {
      startAnimation();
    } else {
      const finalDate = offsetToDate(offsetRef.current, dayOffsetRef.current);
      onChangeRef.current(finalDate);
    }
  }, [startAnimation, offsetToDate]);

  // Time adjustment by minutes (for press-and-hold)
  const adjustTimeByMinutes = useCallback((minutes: number) => {
    stopAnimation();
    const deltaOffset = (minutes / 60) * HOUR_WIDTH;

    const prevOffset = offsetRef.current;
    const newOffset = prevOffset + deltaOffset;
    checkDayCrossing(prevOffset, newOffset);

    const normalizedOffset = ((newOffset % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
    offsetRef.current = normalizedOffset;
    setOffset(normalizedOffset);

    const newDate = offsetToDate(normalizedOffset, dayOffsetRef.current);
    onChange(newDate);
  }, [onChange, stopAnimation, checkDayCrossing, offsetToDate]);

  // Sync dayOffsetRef with state updates
  const setDayOffsetWithRef = useCallback((newOffset: number) => {
    dayOffsetRef.current = newOffset;
    setDayOffset(newOffset);
  }, []);

  return {
    offset,
    dayOffset,
    atBoundary,
    fixedBaseDate,
    dateToOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    adjustTimeByMinutes,
    setDayOffset: setDayOffsetWithRef,
    dayOffsetRef,
  };
}
