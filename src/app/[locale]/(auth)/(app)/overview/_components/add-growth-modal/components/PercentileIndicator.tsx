'use client';

type PercentileIndicatorProps = {
  percentileLabel: string;
};

/**
 * Display WHO percentile bracket for a measurement
 *
 * Shows percentile label in primary color next to measurement input.
 * Used for weight, height, and head circumference indicators.
 */
export function PercentileIndicator({ percentileLabel }: PercentileIndicatorProps) {
  return (
    <span
      className="shrink-0 text-sm font-medium text-primary"
      role="status"
      aria-label={`Percentile: ${percentileLabel}`}
    >
      {percentileLabel}
    </span>
  );
}
