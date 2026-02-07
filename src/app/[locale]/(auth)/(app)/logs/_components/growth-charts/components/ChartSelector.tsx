'use client';

import type { GrowthChartConfig } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ChartSelectorProps = {
  charts: GrowthChartConfig[];
  selectedKey: string;
  onSelect: (config: GrowthChartConfig) => void;
};

export function ChartSelector({ charts, selectedKey, onSelect }: ChartSelectorProps) {
  const selectedChart = charts.find(c => c.key === selectedKey);

  return (
    <Select
      value={selectedKey}
      onValueChange={(value) => {
        const chart = charts.find(c => c.key === value);
        if (chart) {
          onSelect(chart);
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select chart type">
          {selectedChart?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {charts.map(chart => (
          <SelectItem key={chart.key} value={chart.key}>
            {chart.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
