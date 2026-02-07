/**
 * Percentile Calculation Utilities
 *
 * Calculate WHO percentile brackets for weight, height, and head circumference
 * based on baby's age, gender, and measurement value.
 */

import type { GrowthChartKey } from './growth-chart-data';
import { getWHOPercentileData } from './growth-chart-data';

export type PercentileParams = {
  value: number; // Value in display units (kg or cm)
  metric: 'weight' | 'length' | 'head';
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  ageInMonths: number;
};

/**
 * Calculate which WHO percentile bracket a measurement falls into
 *
 * @param params - Measurement parameters (value, metric, gender, age)
 * @returns Percentile bracket string (e.g., ">97%") or null if not calculable
 *
 * Returns null if:
 * - Gender is not 'male' or 'female' (WHO data requires binary gender)
 * - Age is outside 0-24 months range (WHO data limit)
 * - Value is null, undefined, or <= 0
 */
export function calculatePercentile(params: PercentileParams): string | null {
  const { value, metric, gender, ageInMonths } = params;

  // Validate inputs
  if (!gender || (gender !== 'male' && gender !== 'female')) {
    return null; // Need binary gender for WHO charts
  }
  if (ageInMonths < 0 || ageInMonths > 24) {
    return null; // WHO data only goes 0-24 months
  }
  if (!value || value <= 0) {
    return null;
  }

  // Map metric + gender to chart key
  const chartKeyMap: Record<string, GrowthChartKey> = {
    'weight-male': 'cht-wfa-boys-p-0-2',
    'weight-female': 'cht-wfa-girls-p-0-2',
    'length-male': 'cht-lfa-boys-p-0-2',
    'length-female': 'cht-lfa-girls-p-0-2',
    'head-male': 'cht_hcfa_boys_p_0_2',
    'head-female': 'cht_hcfa_girls_p_0_2',
  };

  const chartKey = chartKeyMap[`${metric}-${gender}`];
  if (!chartKey) {
    return null;
  }

  // Get WHO data
  const whoData = getWHOPercentileData(chartKey);
  if (whoData.length === 0) {
    return null;
  }

  // Find data point for age (round to nearest month)
  const roundedMonth = Math.round(ageInMonths);
  const dataPoint = whoData.find(d => d.month === roundedMonth);

  if (!dataPoint) {
    return null;
  }

  // Compare value against percentile curves
  if (value < dataPoint.p3) {
    return '<3%';
  } else if (value < dataPoint.p15) {
    return '3-15%';
  } else if (value < dataPoint.p50) {
    return '15-50%';
  } else if (value < dataPoint.p85) {
    return '50-85%';
  } else if (value < dataPoint.p97) {
    return '85-97%';
  } else {
    return '>97%';
  }
}
