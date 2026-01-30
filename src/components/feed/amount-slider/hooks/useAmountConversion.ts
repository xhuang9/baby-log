'use client';

import { useCallback } from 'react';
import { ML_PER_OZ } from '../../constants';

type UseAmountConversionOptions = {
  useMetric: boolean;
};

export function useAmountConversion({ useMetric }: UseAmountConversionOptions) {
  // Convert ml to display unit
  const mlToDisplay = useCallback((ml: number): number => {
    if (!useMetric) {
      return ml / ML_PER_OZ;
    }
    return ml;
  }, [useMetric]);

  // Convert display unit to ml
  const displayToMl = useCallback((displayValue: number): number => {
    if (!useMetric) {
      return displayValue * ML_PER_OZ;
    }
    return displayValue;
  }, [useMetric]);

  // Format amount for display
  const formatAmount = useCallback((valueMl: number): string => {
    const displayValue = mlToDisplay(valueMl);
    return !useMetric
      ? `${displayValue.toFixed(1)} oz`
      : `${Math.round(displayValue)} ml`;
  }, [useMetric, mlToDisplay]);

  return {
    mlToDisplay,
    displayToMl,
    formatAmount,
  };
}
