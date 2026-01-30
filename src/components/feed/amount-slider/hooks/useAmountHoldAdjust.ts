'use client';

import type { AmountSliderSettingsState } from '@/components/settings';
import { useCallback, useEffect, useRef } from 'react';

// Acceleration tiers for press-and-hold
const AMOUNT_SPEED_TIERS: readonly { threshold: number; multiplier: number; repeatMs: number }[] = [
  { threshold: 0, multiplier: 1, repeatMs: 200 }, // 0.0s – 0.6s: 1x increment
  { threshold: 600, multiplier: 2, repeatMs: 150 }, // 0.6s – 1.5s: 2x increment
  { threshold: 1500, multiplier: 5, repeatMs: 120 }, // 1.5s – 3.0s: 5x increment
  { threshold: 3000, multiplier: 10, repeatMs: 100 }, // 3.0s+: 10x increment
] as const;

function getAmountTier(index: number): { threshold: number; multiplier: number; repeatMs: number } {
  const tier = AMOUNT_SPEED_TIERS[index];
  if (tier) {
    return tier;
  }
  return { threshold: 0, multiplier: 1, repeatMs: 200 };
}

function getCurrentAmountTier(elapsed: number): number {
  for (let i = AMOUNT_SPEED_TIERS.length - 1; i >= 0; i--) {
    const tier = AMOUNT_SPEED_TIERS[i];
    if (tier && elapsed >= tier.threshold) {
      return i;
    }
  }
  return 0;
}

type UseAmountHoldAdjustOptions = {
  value: number;
  settings: AmountSliderSettingsState;
  mlToDisplay: (ml: number) => number;
  displayToMl: (displayValue: number) => number;
  onChange: (amountMl: number) => void;
};

export function useAmountHoldAdjust({
  value,
  settings,
  mlToDisplay,
  displayToMl,
  onChange,
}: UseAmountHoldAdjustOptions) {
  const holdStartRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTierRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);

  // Store latest values in refs for use in interval callback
  const valueRef = useRef(value);
  const settingsRef = useRef(settings);
  const mlToDisplayRef = useRef(mlToDisplay);
  const displayToMlRef = useRef(displayToMl);
  const onChangeRef = useRef(onChange);

  // Keep refs up to date
  useEffect(() => {
    valueRef.current = value;
    settingsRef.current = settings;
    mlToDisplayRef.current = mlToDisplay;
    displayToMlRef.current = displayToMl;
    onChangeRef.current = onChange;
  });

  // +/- adjustment with multiplier support (uses refs for stable reference)
  const adjustAmount = useCallback((direction: 1 | -1, multiplier: number = 1) => {
    const displayValue = mlToDisplayRef.current(valueRef.current);
    const newDisplayValue = displayValue + (settingsRef.current.increment * multiplier * direction);
    const newMl = displayToMlRef.current(newDisplayValue);

    // Clamp to min/max
    const clampedMl = Math.max(settingsRef.current.minAmount, Math.min(settingsRef.current.maxAmount, newMl));
    onChangeRef.current(Math.round(clampedMl));
  }, []);

  // Ref to store the tick function for self-scheduling
  const tickAmountRef = useRef<() => void>(() => {});

  // Update tick function ref in effect (not during render)
  useEffect(() => {
    tickAmountRef.current = () => {
      const elapsed = performance.now() - holdStartRef.current;
      const newTier = getCurrentAmountTier(elapsed);

      // Update tier and reschedule if tier changed
      if (newTier !== currentTierRef.current) {
        currentTierRef.current = newTier;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => tickAmountRef.current(), getAmountTier(newTier).repeatMs);
        }
      }

      const multiplier = getAmountTier(currentTierRef.current).multiplier;
      adjustAmount(directionRef.current, multiplier);
    };
  }, [adjustAmount]);

  const handleHoldStart = useCallback((direction: 1 | -1) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    holdStartRef.current = performance.now();
    currentTierRef.current = 0;
    directionRef.current = direction;

    // Immediate first tick
    adjustAmount(direction, 1);

    // Start interval
    intervalRef.current = setInterval(() => tickAmountRef.current(), getAmountTier(0).repeatMs);
  }, [adjustAmount]);

  const handleHoldStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    handleHoldStart,
    handleHoldStop,
  };
}
