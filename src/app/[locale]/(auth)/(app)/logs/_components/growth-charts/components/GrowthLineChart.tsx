'use client';

import type { GrowthChartDataPoint } from '../hooks';
import type { GrowthChartConfig } from '../types';
import type { ChartConfig } from '@/components/ui/chart';
import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type GrowthLineChartProps = {
  data: GrowthChartDataPoint[];
  config: GrowthChartConfig;
};

export function GrowthLineChart({ data, config }: GrowthLineChartProps) {
  // Track responsive state for tick spacing
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Chart configuration for shadcn/ui chart
  const chartConfig: ChartConfig = {
    p3: {
      label: '3rd',
      color: 'var(--muted-foreground)',
    },
    p15: {
      label: '15th',
      color: 'var(--muted-foreground)',
    },
    p50: {
      label: '50th',
      color: 'var(--primary)',
    },
    p85: {
      label: '85th',
      color: 'var(--muted-foreground)',
    },
    p97: {
      label: '97th',
      color: 'var(--muted-foreground)',
    },
    baby: {
      label: 'Baby',
      color: 'var(--color-activity-growth-background)',
    },
  };

  // Calculate Y-axis domain based on data
  const allValues = data.flatMap(d => [d.p3, d.p97, d.baby].filter((v): v is number => v !== undefined));
  const minY = Math.floor(Math.min(...allValues) * 0.95);
  const maxY = Math.ceil(Math.max(...allValues) * 1.05);

  // Calculate reasonable Y-axis tick interval (aim for ~6 ticks)
  const range = maxY - minY;
  const rawInterval = range / 6;
  // Round to nice intervals: 1, 2, 5, 10, 20, 50, etc.
  const magnitude = 10 ** Math.floor(Math.log10(rawInterval));
  const normalized = rawInterval / magnitude;
  const niceInterval = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const tickInterval = niceInterval * magnitude;

  // Generate Y-axis ticks at nice intervals
  const yAxisTicks: number[] = [];
  const startTick = Math.ceil(minY / tickInterval) * tickInterval;
  for (let tick = startTick; tick <= maxY; tick += tickInterval) {
    yAxisTicks.push(tick);
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart
        data={data}
        margin={{ top: 8, right: 12, bottom: 18, left: 16 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          strokeOpacity={0.5}
          vertical={true}
          horizontal={true}
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={value => value.toString()}
          ticks={isMobile
            ? Array.from({ length: 13 }, (_, i) => i * 2)
            : Array.from({ length: 25 }, (_, i) => i)}
          label={{ value: 'Months', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={2}
          domain={[minY, maxY]}
          ticks={yAxisTicks}
          tickFormatter={value => value.toString()}
          width={24}
          label={{
            value: config.unit,
            angle: -90,
            position: 'insideLeft',
            offset: -8,
            style: { textAnchor: 'middle', fontSize: 12 },
          }}
        />
        <ChartTooltip
          content={(
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                // Use the actual data point's month value from payload
                const month = payload?.[0]?.payload?.month;
                return month !== undefined ? `${month} months` : '';
              }}
              formatter={(value, name) => {
                const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                const isBaby = name === 'baby';
                const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;
                return (
                  <span className="flex items-center gap-2">
                    <span
                      className={isBaby ? 'font-medium' : 'text-muted-foreground'}
                      style={isBaby ? { color: 'var(--color-baby)' } : undefined}
                    >
                      {label}
                      :
                    </span>
                    <span className="font-mono font-medium">
                      {formattedValue}
                      {config.unit}
                    </span>
                  </span>
                );
              }}
            />
          )}
        />

        {/* Percentile lines - outer ones dotted, inner ones dashed */}
        <Line
          type="monotone"
          dataKey="p3"
          stroke="var(--color-p3)"
          strokeWidth={1}
          strokeDasharray="2 4"
          strokeOpacity={0.4}
          dot={false}
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="p15"
          stroke="var(--color-p15)"
          strokeWidth={1}
          strokeDasharray="8 4"
          strokeOpacity={0.6}
          dot={false}
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="p50"
          stroke="var(--color-p50)"
          strokeWidth={2}
          dot={false}
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="p85"
          stroke="var(--color-p85)"
          strokeWidth={1}
          strokeDasharray="8 4"
          strokeOpacity={0.6}
          dot={false}
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="p97"
          stroke="var(--color-p97)"
          strokeWidth={1}
          strokeDasharray="2 4"
          strokeOpacity={0.4}
          dot={false}
          activeDot={false}
        />

        {/* Baby's measurements - solid line with dots */}
        <Line
          type="monotone"
          dataKey="baby"
          stroke="var(--color-baby)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-baby)', r: 4 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}
