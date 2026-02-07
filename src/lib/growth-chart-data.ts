/**
 * WHO Growth Chart Data Loader
 *
 * Loads and transforms WHO percentile data for growth charts.
 * Data source: .readme/growth-charts/growth-chart-points.json
 */

// Import WHO data statically to avoid runtime JSON loading
import whoData from '@/data/who-growth-charts.json';

// ============================================================================
// Types
// ============================================================================

export type GrowthChartKey
  = | 'cht-lfa-girls-p-0-2'
    | 'cht-lfa-boys-p-0-2'
    | 'cht-wfa-girls-p-0-2'
    | 'cht-wfa-boys-p-0-2'
    | 'cht_hcfa_girls_p_0_2'
    | 'cht_hcfa_boys_p_0_2';

export type PercentileKey = '3rd' | '15th' | '50th' | '85th' | '97th';

export type WHOPercentileDataPoint = {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

type WHOChartData = {
  source_csv: string;
  sex: 'male' | 'female';
  metric: string;
  unit: string;
  age_unit: string;
  age_range_months: [number, number];
  percentiles: {
    '3rd': Array<{ month: number; value: number }>;
    '15th': Array<{ month: number; value: number }>;
    '50th': Array<{ month: number; value: number }>;
    '85th': Array<{ month: number; value: number }>;
    '97th': Array<{ month: number; value: number }>;
  };
};

// ============================================================================
// Data Access
// ============================================================================

/**
 * Get WHO percentile data for a specific chart, transformed for Recharts
 */
export function getWHOPercentileData(chartKey: GrowthChartKey): WHOPercentileDataPoint[] {
  const chartData = whoData[chartKey] as WHOChartData | undefined;

  if (!chartData) {
    console.warn(`No WHO data found for chart key: ${chartKey}`);
    return [];
  }

  const { percentiles } = chartData;

  // Transform to Recharts-compatible format
  // All percentile arrays have the same months (0-24), so use 3rd as base
  return percentiles['3rd'].map((point, index) => ({
    month: point.month,
    p3: percentiles['3rd'][index]?.value ?? 0,
    p15: percentiles['15th'][index]?.value ?? 0,
    p50: percentiles['50th'][index]?.value ?? 0,
    p85: percentiles['85th'][index]?.value ?? 0,
    p97: percentiles['97th'][index]?.value ?? 0,
  }));
}

/**
 * Get metadata about a specific chart
 */
export function getChartMetadata(chartKey: GrowthChartKey) {
  const chartData = whoData[chartKey] as WHOChartData | undefined;

  if (!chartData) {
    return null;
  }

  return {
    sex: chartData.sex,
    metric: chartData.metric,
    unit: chartData.unit,
    ageUnit: chartData.age_unit,
    ageRange: chartData.age_range_months,
  };
}
