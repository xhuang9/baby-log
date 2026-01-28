'use client';

import { useCallback, useEffect, useRef } from 'react';

// Acceleration tiers based on hold duration
const SPEED_TIERS: readonly { threshold: number; minutes: number; repeatMs: number }[] = [
  { threshold: 0, minutes: 1, repeatMs: 200 }, // 0.0s – 0.6s: precise
  { threshold: 600, minutes: 5, repeatMs: 150 }, // 0.6s – 1.5s: common adjustment
  { threshold: 1500, minutes: 15, repeatMs: 120 }, // 1.5s – 3.0s: jump within hour
  { threshold: 3000, minutes: 30, repeatMs: 100 }, // 3.0s – 5.0s: jump across blocks
  { threshold: 5000, minutes: 60, repeatMs: 80 }, // > 5.0s: fast travel
] as const;

// Time window to resume previous speed (ms)
const RESUME_WINDOW = 1500;

type UsePressAndHoldProps = {
  onAdjust: (minutes: number) => void;
};

function getTier(index: number): { threshold: number; minutes: number; repeatMs: number } {
  const tier = SPEED_TIERS[index];
  if (tier) {
    return tier;
  }
  // Fallback to first tier (always defined)
  return { threshold: 0, minutes: 1, repeatMs: 200 };
}

function getCurrentTier(elapsed: number): number {
  for (let i = SPEED_TIERS.length - 1; i >= 0; i--) {
    const tier = SPEED_TIERS[i];
    if (tier && elapsed >= tier.threshold) {
      return i;
    }
  }
  return 0;
}

export function usePressAndHold({ onAdjust }: UsePressAndHoldProps) {
  const holdStartRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTierRef = useRef(0);
  const lastReleaseTimeRef = useRef(0);
  const lastDirectionRef = useRef<1 | -1 | null>(null);
  const previousTierRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const onAdjustRef = useRef(onAdjust);

  // Ref to store the tick function to avoid circular dependency
  const tickRef = useRef<(() => void) | null>(null);

  // Keep onAdjust ref up to date
  useEffect(() => {
    onAdjustRef.current = onAdjust;
  }, [onAdjust]);

  // Initialize tick function in effect to avoid hoisting issues
  useEffect(() => {
    tickRef.current = () => {
      const elapsed = performance.now() - holdStartRef.current;
      const newTier = getCurrentTier(elapsed);
      const direction = directionRef.current;

      // Update tier and reschedule if tier changed
      if (newTier !== currentTierRef.current) {
        currentTierRef.current = newTier;
        // Clear old interval and start new one with updated speed
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => tickRef.current?.(), getTier(newTier).repeatMs);
        }
      }

      const minutes = getTier(currentTierRef.current).minutes;
      onAdjustRef.current(minutes * direction);
    };
  }, []);

  const startHold = useCallback((direction: 1 | -1) => {
    // Stop any existing hold
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const now = performance.now();
    const timeSinceLastRelease = now - lastReleaseTimeRef.current;

    // Determine starting tier
    let startTier = 0;

    // If within resume window and same direction, resume from previous speed
    if (timeSinceLastRelease < RESUME_WINDOW && lastDirectionRef.current === direction) {
      startTier = previousTierRef.current;
    } else if (timeSinceLastRelease < RESUME_WINDOW && lastDirectionRef.current !== null && lastDirectionRef.current !== direction) {
      // If reversing direction, drop one tier (but not below 0)
      startTier = Math.max(0, previousTierRef.current - 1);
    }

    currentTierRef.current = startTier;
    holdStartRef.current = now - getTier(startTier).threshold; // Adjust start time to match tier
    lastDirectionRef.current = direction;
    directionRef.current = direction;

    // Immediate first tick
    const minutes = getTier(startTier).minutes;
    onAdjustRef.current(minutes * direction);

    // Start interval
    intervalRef.current = setInterval(() => tickRef.current?.(), getTier(startTier).repeatMs);
  }, []);

  const stopHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    lastReleaseTimeRef.current = performance.now();
    previousTierRef.current = currentTierRef.current;
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    startHold,
    stopHold,
    cleanup,
  };
}
