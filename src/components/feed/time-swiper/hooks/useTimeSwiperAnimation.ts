'use client';

import type { SwipeResistance } from '@/components/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FUTURE_DAYS_LIMIT_PAST, FUTURE_DAYS_LIMIT_TODAY, HOUR_WIDTH, MAX_ANIMATION_DURATION, PAST_DAYS_LIMIT, TOTAL_WIDTH } from '../constants';

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
  isToday: boolean;
  swipeResistance: SwipeResistance;
  swipeSpeed: number;
};

export function useTimeSwiperAnimation({
  value,
  onChange,
  isToday,
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
  const [dayOffset, setDayOffset] = useState(0);
  const [atBoundary, setAtBoundary] = useState<'past' | 'future' | null>(null);

  // Fixed base date for stable calculations (computed once on mount)
  const [fixedBaseDate] = useState(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  });

  // Refs for latest values in animation loop
  const onChangeRef = useRef(onChange);
  const swipeResistanceRef = useRef(swipeResistance);
  const isTodayRef = useRef(isToday);

  useEffect(() => {
    onChangeRef.current = onChange;
    swipeResistanceRef.current = swipeResistance;
    isTodayRef.current = isToday;
  }, [onChange, swipeResistance, isToday]);

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

  const clampDayOffset = useCallback((newDayOffset: number): number => {
    const futureLimit = isTodayRef.current ? FUTURE_DAYS_LIMIT_TODAY : FUTURE_DAYS_LIMIT_PAST;
    return Math.max(-PAST_DAYS_LIMIT, Math.min(futureLimit, newDayOffset));
  }, []);

  const checkDayCrossing = useCallback((prevOffset: number, newOffset: number) => {
    const prevNormalized = ((prevOffset % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
    const newNormalized = ((newOffset % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
    const futureLimit = isTodayRef.current ? FUTURE_DAYS_LIMIT_TODAY : FUTURE_DAYS_LIMIT_PAST;

    if (prevNormalized > TOTAL_WIDTH * 0.75 && newNormalized < TOTAL_WIDTH * 0.25) {
      const clamped = clampDayOffset(dayOffsetRef.current + 1);
      if (clamped !== dayOffsetRef.current) {
        dayOffsetRef.current = clamped;
        setDayOffset(clamped);
        setAtBoundary(null);
      } else if (dayOffsetRef.current >= futureLimit) {
        setAtBoundary('future');
        setTimeout(() => setAtBoundary(null), 600);
      }
    } else if (prevNormalized < TOTAL_WIDTH * 0.25 && newNormalized > TOTAL_WIDTH * 0.75) {
      const clamped = clampDayOffset(dayOffsetRef.current - 1);
      if (clamped !== dayOffsetRef.current) {
        dayOffsetRef.current = clamped;
        setDayOffset(clamped);
        setAtBoundary(null);
      } else if (dayOffsetRef.current <= -PAST_DAYS_LIMIT) {
        setAtBoundary('past');
        setTimeout(() => setAtBoundary(null), 600);
      }
    }
  }, [clampDayOffset]);

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
      velocityRef.current = initialVelocity * currentVelocityFactor * 0.3;

      const prevOffset = offsetRef.current;
      offsetRef.current += velocityRef.current;
      checkDayCrossing(prevOffset, offsetRef.current);
      offsetRef.current = ((offsetRef.current % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH;
      setOffset(offsetRef.current);

      const currentDate = offsetToDate(offsetRef.current, dayOffsetRef.current);
      onChangeRef.current(currentDate);

      animationRef.current = requestAnimationFrame(() => animateLoopRef.current?.());
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
    dateToOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    adjustTimeByMinutes,
    setDayOffset: setDayOffsetWithRef,
    dayOffsetRef,
  };
}
