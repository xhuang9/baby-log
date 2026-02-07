/**
 * Growth Charts Constants
 */

import type { GrowthChartConfig } from './types';

/**
 * All available growth chart configurations
 */
export const CHART_CONFIGS: GrowthChartConfig[] = [
  // Girls charts
  {
    key: 'cht-lfa-girls-p-0-2',
    metric: 'length',
    gender: 'female',
    label: 'Length (Girls)',
    unit: 'cm',
  },
  {
    key: 'cht-wfa-girls-p-0-2',
    metric: 'weight',
    gender: 'female',
    label: 'Weight (Girls)',
    unit: 'kg',
  },
  {
    key: 'cht_hcfa_girls_p_0_2',
    metric: 'head',
    gender: 'female',
    label: 'Head Circumference (Girls)',
    unit: 'cm',
  },
  // Boys charts
  {
    key: 'cht-lfa-boys-p-0-2',
    metric: 'length',
    gender: 'male',
    label: 'Length (Boys)',
    unit: 'cm',
  },
  {
    key: 'cht-wfa-boys-p-0-2',
    metric: 'weight',
    gender: 'male',
    label: 'Weight (Boys)',
    unit: 'kg',
  },
  {
    key: 'cht_hcfa_boys_p_0_2',
    metric: 'head',
    gender: 'male',
    label: 'Head Circumference (Boys)',
    unit: 'cm',
  },
];

/**
 * Get available charts based on baby's gender
 */
export function getChartsForGender(
  gender: 'male' | 'female' | 'other' | 'unknown' | null,
): GrowthChartConfig[] {
  if (gender === 'male') {
    return CHART_CONFIGS.filter(c => c.gender === 'male');
  }
  if (gender === 'female') {
    return CHART_CONFIGS.filter(c => c.gender === 'female');
  }
  // Show all 6 charts for unknown/other gender
  return CHART_CONFIGS;
}

/**
 * Percentile line colors (using CSS variables for theme support)
 */
export const PERCENTILE_COLORS = {
  p3: 'hsl(var(--muted-foreground) / 0.5)',
  p15: 'hsl(var(--muted-foreground) / 0.7)',
  p50: 'hsl(var(--primary))',
  p85: 'hsl(var(--muted-foreground) / 0.7)',
  p97: 'hsl(var(--muted-foreground) / 0.5)',
  baby: 'hsl(var(--chart-1))',
} as const;

/**
 * Percentile labels for legend
 */
export const PERCENTILE_LABELS = {
  p3: '3rd',
  p15: '15th',
  p50: '50th',
  p85: '85th',
  p97: '97th',
} as const;
