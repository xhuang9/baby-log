'use client';

import type { BabyMeasurement, GrowthChartConfig } from '../types';
import type { WHOPercentileDataPoint } from '@/lib/growth-chart-data';
import type { LocalBaby, LocalGrowthLog } from '@/lib/local-db';
import { useMemo } from 'react';
import { getWHOPercentileData } from '@/lib/growth-chart-data';
import { getBirthDateForCalculation } from '../utils';

export type GrowthChartDataPoint = WHOPercentileDataPoint & {
  baby?: number; // Baby's measurement at this month (if exists)
};

/**
 * Combines WHO percentile data with baby's growth measurements
 */
export function useGrowthChartData(
  baby: LocalBaby | null | undefined,
  growthLogs: LocalGrowthLog[] | undefined,
  chartConfig: GrowthChartConfig,
  userCreatedAt: Date | null | undefined,
) {
  // Get WHO percentile data for this chart
  const whoData = useMemo(() => {
    return getWHOPercentileData(chartConfig.key);
  }, [chartConfig.key]);

  // Convert baby's growth logs to measurements with age in months
  const babyMeasurements = useMemo((): BabyMeasurement[] => {
    if (!baby || !growthLogs) {
      return [];
    }

    // Get birth date with fallback to user registration date
    const birthDateCalc = getBirthDateForCalculation(baby, userCreatedAt);
    if (!birthDateCalc) {
      return [];
    }

    const birthDate = birthDateCalc.birthDate;

    return growthLogs
      .map((log) => {
        // Get the value based on chart metric
        let value: number | null = null;
        if (chartConfig.metric === 'length' && log.heightMm !== null) {
          value = log.heightMm / 10; // mm to cm
        } else if (chartConfig.metric === 'weight' && log.weightG !== null) {
          value = log.weightG / 1000; // g to kg
        } else if (chartConfig.metric === 'head' && log.headCircumferenceMm !== null) {
          value = log.headCircumferenceMm / 10; // mm to cm
        }

        if (value === null) {
          return null;
        }

        // Calculate age in months at measurement time
        const measurementDate = new Date(log.startedAt);
        const ageInMonths = calculateAgeInMonths(birthDate, measurementDate);

        // Only include measurements within 0-24 month range
        if (ageInMonths < 0 || ageInMonths > 24) {
          return null;
        }

        return {
          month: ageInMonths,
          value,
          date: measurementDate,
          id: log.id,
        };
      })
      .filter((m): m is BabyMeasurement => m !== null)
      .sort((a, b) => a.month - b.month);
  }, [baby, growthLogs, chartConfig.metric, userCreatedAt]);

  // Combine WHO data with baby measurements for the chart
  const chartData = useMemo((): GrowthChartDataPoint[] => {
    // Create a map of baby measurements by rounded month
    const measurementsByMonth = new Map<number, number>();
    for (const m of babyMeasurements) {
      // Round to nearest 0.5 month for plotting
      const roundedMonth = Math.round(m.month * 2) / 2;
      // Keep the latest measurement for each month point
      measurementsByMonth.set(roundedMonth, m.value);
    }

    // Add baby measurements to WHO data points
    return whoData.map(point => ({
      ...point,
      baby: measurementsByMonth.get(point.month),
    }));
  }, [whoData, babyMeasurements]);

  return {
    chartData,
    babyMeasurements,
    hasData: babyMeasurements.length > 0,
    birthDateInfo: baby ? getBirthDateForCalculation(baby, userCreatedAt) : null,
  };
}

/**
 * Calculate age in months from birth date to measurement date
 * Returns decimal months for precise plotting
 */
function calculateAgeInMonths(birthDate: Date, measurementDate: Date): number {
  const diffMs = measurementDate.getTime() - birthDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  // Average days in a month (365.25 / 12)
  return diffDays / 30.4375;
}
