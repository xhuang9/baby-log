'use client';

import type { GrowthChartConfig } from './types';
import { useUser } from '@clerk/nextjs';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { AddGrowthModal } from '@/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal';
import { getLocalUserByClerkId, localDb } from '@/lib/local-db';
import {
  BirthDateInfo,
  ChartSelector,
  EmptyGrowthState,
  GrowthLineChart,
  PercentileLegend,
} from './components';
import { getChartsForGender } from './constants';
import { useGrowthChartData } from './hooks';

type GrowthChartsContentProps = {
  babyId: number | null;
};

export function GrowthChartsContent({ babyId }: GrowthChartsContentProps) {
  // Get Clerk user ID
  const { user: clerkUser } = useUser();

  // Fetch baby data
  const baby = useLiveQuery(
    async () => {
      if (babyId === null) {
        return null;
      }
      return localDb.babies.get(babyId) ?? null;
    },
    [babyId],
  );

  // Fetch growth logs for this baby
  const growthLogs = useLiveQuery(
    async () => {
      if (babyId === null) {
        return [];
      }
      return localDb.growthLogs
        .where('babyId')
        .equals(babyId)
        .toArray();
    },
    [babyId],
  );

  // Fetch local user data for registration date
  const localUser = useLiveQuery(
    async () => {
      if (!clerkUser?.id) {
        return null;
      }
      return getLocalUserByClerkId(clerkUser.id);
    },
    [clerkUser?.id],
  );

  // Get available charts based on baby's gender
  const availableCharts = getChartsForGender(baby?.gender ?? null);

  // Track selected chart (default to first available)
  const [selectedChart, setSelectedChart] = useState<GrowthChartConfig | null>(null);

  // Track modal state for adding growth measurements
  const [isGrowthModalOpen, setIsGrowthModalOpen] = useState(false);

  // Use first chart as default when available charts change
  // availableCharts always has at least 3 items, so [0] is safe
  const defaultChart = availableCharts[0]!;
  const currentChart = selectedChart && availableCharts.some(c => c.key === selectedChart.key)
    ? selectedChart
    : defaultChart;

  // Get chart data combining WHO percentiles with baby measurements
  const { chartData, hasData, birthDateInfo } = useGrowthChartData(
    baby,
    growthLogs,
    currentChart,
    localUser?.createdAt ?? null,
  );

  // Loading state
  if (baby === undefined || growthLogs === undefined || localUser === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No baby selected
  if (!baby) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">No baby selected</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-4">
      {/* Chart selector */}
      <ChartSelector
        charts={availableCharts}
        selectedKey={currentChart.key}
        onSelect={setSelectedChart}
      />

      {/* Birth date info */}
      <BirthDateInfo birthDateInfo={birthDateInfo} />

      {/* Chart container - full height on mobile, scrollable */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card md:aspect-[4/3] md:flex-none md:overflow-visible">
        {/* Horizontal scroll wrapper for mobile */}
        <div className="min-h-0 flex-1 overflow-x-auto md:overflow-visible">
          <div className="h-full min-w-full md:min-w-0">
            <GrowthLineChart data={chartData} config={currentChart} />
          </div>
        </div>

        {/* Legend - hidden on mobile, shown on desktop */}
        <div className="hidden shrink-0 border-t bg-card p-4 md:block">
          <PercentileLegend />
        </div>

        {/* Empty state overlay */}
        {!hasData && (
          <button
            type="button"
            onClick={() => setIsGrowthModalOpen(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-all hover:bg-black/15"
          >
            <EmptyGrowthState />
          </button>
        )}
      </div>

      {/* Growth modal */}
      {baby && (
        <AddGrowthModal
          babyId={baby.id}
          open={isGrowthModalOpen}
          onOpenChange={setIsGrowthModalOpen}
        />
      )}
    </div>
  );
}
