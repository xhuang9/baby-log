'use client';

import type { UnifiedLog } from '@/lib/format-log';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllActivityLogs } from '@/hooks/useAllActivityLogs';
import { ACTIVITY_TYPES, useLogsFilters } from '@/hooks/useLogsFilters';
import { localDb } from '@/lib/local-db';
import { ActivityTypePills } from './ActivityTypePills';
import { EditBathModal } from './edit-modals/EditBathModal';
import { EditFeedModal } from './edit-modals/EditFeedModal';
import { EditGrowthModal } from './edit-modals/EditGrowthModal';
import { EditMedicationModal } from './edit-modals/EditMedicationModal';
import { EditNappyModal } from './edit-modals/EditNappyModal';
import { EditPumpingModal } from './edit-modals/EditPumpingModal';
import { EditSleepModal } from './edit-modals/EditSleepModal';
import { EditSolidsModal } from './edit-modals/EditSolidsModal';
import { GrowthChartsContent } from './growth-charts';
import { LogsFilters } from './LogsFilters';
import { LogsList } from './LogsList';
import { ActivityTimelineChart } from './timeline-chart';

export type LogsViewTab = 'listing' | 'today' | 'week' | 'growth';

/**
 * Main orchestrator component for the activity logs page
 * Manages filter state, tabs, and modal state, coordinates display components
 *
 * Performance optimizations:
 * - Lazy tab rendering: chart tabs only mount after first visit
 * - Unified data query: single fetch, filter in useMemo for different views
 */
export function LogsContent() {
  // Get current user and their default baby from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  const babyId = userData?.defaultBabyId ?? null;

  const [editingLog, setEditingLog] = useState<UnifiedLog | null>(null);
  const [activeTab, setActiveTab] = useState<LogsViewTab>('listing');

  // Track which tabs have been visited (for lazy rendering)
  const [visitedTabs, setVisitedTabs] = useState<Set<LogsViewTab>>(() => new Set(['listing']));

  // Filters with URL sync (for listing view)
  const { activeTypes, timeRange, startDate, endDate, setActiveTypes, setTimeRange }
    = useLogsFilters();

  // Separate filter state for chart views (not synced to URL)
  const [chartActiveTypes, setChartActiveTypes] = useState(ACTIVITY_TYPES.map(t => t.value));

  // Handle tab change - mark tab as visited for lazy rendering
  const handleTabChange = useCallback((value: string) => {
    const tab = value as LogsViewTab;
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  }, []);

  // Unified data query: fetch ALL logs (no date restriction, all activity types)
  // This single query feeds both listing and chart views
  const allActivityTypes = ACTIVITY_TYPES.map(t => t.value);
  const allLogs = useAllActivityLogs(babyId, allActivityTypes, null, null);

  // Filter logs for listing view (by date range and selected activity types)
  const filteredListingLogs = useMemo(() => {
    if (!allLogs) {
      return undefined;
    }

    return allLogs.filter((log) => {
      // Filter by activity type
      if (!activeTypes.includes(log.type)) {
        return false;
      }

      // Filter by date range (if specified)
      if (startDate && endDate) {
        const logTime = log.startedAt.getTime();
        if (logTime < startDate.getTime() || logTime > endDate.getTime()) {
          return false;
        }
      }

      return true;
    });
  }, [allLogs, activeTypes, startDate, endDate]);

  // Filter logs for chart views (by chart activity types only, no date restriction)
  const filteredChartLogs = useMemo(() => {
    if (!allLogs) {
      return undefined;
    }
    return allLogs.filter(log => chartActiveTypes.includes(log.type));
  }, [allLogs, chartActiveTypes]);

  const handleOpenEditModal = useCallback((log: UnifiedLog) => {
    setEditingLog(log);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingLog(null);
  }, []);

  return (
    <div className="flex h-full flex-col gap-2 md:gap-4">
      {/* Tabs navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-full shrink-0">
          <TabsTrigger value="listing" className="flex-1">
            Listing
          </TabsTrigger>
          <TabsTrigger value="today" className="flex-1">
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="flex-1">
            Week
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex-1">
            Growth
          </TabsTrigger>
        </TabsList>

        {/* Listing View */}
        <TabsContent value="listing" className="flex flex-col gap-3 md:gap-4">
          {/* Filter controls */}
          <LogsFilters
            activeTypes={activeTypes}
            setActiveTypes={setActiveTypes}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />

          {/* Logs list */}
          <LogsList
            logs={filteredListingLogs}
            hasAnyLogs={Boolean(allLogs && allLogs.length > 0)}
            onEditLog={handleOpenEditModal}
          />
        </TabsContent>

        {/* Today View - lazy render only after first visit */}
        <TabsContent value="today" className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
          {visitedTabs.has('today') && (
            <>
              {/* Activity type filter pills */}
              <ActivityTypePills
                activeTypes={chartActiveTypes}
                setActiveTypes={setChartActiveTypes}
              />

              {/* Timeline chart */}
              <ActivityTimelineChart
                logs={filteredChartLogs}
                mode="today"
                onEditLog={handleOpenEditModal}
              />
            </>
          )}
        </TabsContent>

        {/* Week View - lazy render only after first visit */}
        <TabsContent value="week" className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
          {visitedTabs.has('week') && (
            <>
              {/* Activity type filter pills */}
              <ActivityTypePills
                activeTypes={chartActiveTypes}
                setActiveTypes={setChartActiveTypes}
              />

              {/* Timeline chart */}
              <ActivityTimelineChart
                logs={filteredChartLogs}
                mode="week"
                onEditLog={handleOpenEditModal}
              />
            </>
          )}
        </TabsContent>

        {/* Growth View - lazy render only after first visit */}
        <TabsContent value="growth" className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
          {visitedTabs.has('growth') && <GrowthChartsContent babyId={babyId} />}
        </TabsContent>
      </Tabs>

      {/* Edit modals - render appropriate modal based on log type */}
      {editingLog?.type === 'feed' && (
        <EditFeedModal
          log={editingLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}

      {editingLog?.type === 'sleep' && (
        <EditSleepModal
          log={editingLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}

      {editingLog?.type === 'nappy' && (
        <EditNappyModal
          nappy={editingLog.data as import('@/lib/local-db').LocalNappyLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}

      {editingLog?.type === 'solids' && (
        <EditSolidsModal
          solids={editingLog.data as import('@/lib/local-db').LocalSolidsLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
          onSuccess={() => {
            // UI will update automatically via useLiveQuery
          }}
        />
      )}

      {editingLog?.type === 'pumping' && (
        <EditPumpingModal
          pumping={editingLog.data as import('@/lib/local-db').LocalPumpingLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}

      {editingLog?.type === 'growth' && (
        <EditGrowthModal
          growth={editingLog.data as import('@/lib/local-db').LocalGrowthLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}

      {editingLog?.type === 'bath' && (
        <EditBathModal
          bath={editingLog.data as import('@/lib/local-db').LocalBathLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}

      {editingLog?.type === 'medication' && (
        <EditMedicationModal
          medication={editingLog.data as import('@/lib/local-db').LocalMedicationLog}
          open={Boolean(editingLog)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        />
      )}
    </div>
  );
}
