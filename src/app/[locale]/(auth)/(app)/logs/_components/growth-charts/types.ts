/**
 * Growth Charts Type Definitions
 */

import type { GrowthChartKey } from '@/lib/growth-chart-data';

export type GrowthMetric = 'length' | 'weight' | 'head';

export type GrowthChartConfig = {
  key: GrowthChartKey;
  metric: GrowthMetric;
  gender: 'male' | 'female';
  label: string;
  unit: string;
};

export type BabyMeasurement = {
  month: number; // Age in months at measurement time
  value: number; // Measurement value in chart units (cm or kg)
  date: Date; // Original measurement date
  id: string; // Log ID for reference
};
