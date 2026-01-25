'use client';

import type { UnifiedLog } from '@/lib/format-log';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllActivityLogs } from '@/hooks/useAllActivityLogs';
import { useLogsFilters } from '@/hooks/useLogsFilters';
import { localDb } from '@/lib/local-db';
import { EditFeedModal } from './edit-modals/EditFeedModal';
import { EditSleepModal } from './edit-modals/EditSleepModal';
import { LogsFilters } from './LogsFilters';
import { LogsList } from './LogsList';

export type LogsViewTab = 'listing' | 'today' | 'week';

/**
 * Main orchestrator component for the activity logs page
 * Manages filter state, tabs, and modal state, coordinates display components
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

  // Filters with URL sync
  const { activeTypes, timeRange, startDate, endDate, setActiveTypes, setTimeRange }
    = useLogsFilters();

  // Fetch unified logs across feed and sleep
  const allLogs = useAllActivityLogs(babyId, activeTypes, startDate, endDate);

  const handleOpenEditModal = useCallback((log: UnifiedLog) => {
    setEditingLog(log);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingLog(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Tabs navigation */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as LogsViewTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="listing" className="flex-1">
            Listing
          </TabsTrigger>
          <TabsTrigger value="today" className="flex-1">
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="flex-1">
            Week
          </TabsTrigger>
        </TabsList>

        {/* Listing View */}
        <TabsContent value="listing" className="mt-4 space-y-4">
          {/* Filter controls */}
          <LogsFilters
            activeTypes={activeTypes}
            setActiveTypes={setActiveTypes}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />

          {/* Logs list */}
          <LogsList
            logs={allLogs}
            hasAnyLogs={Boolean(allLogs && allLogs.length > 0)}
            onEditLog={handleOpenEditModal}
          />
        </TabsContent>

        {/* Today View - Coming Soon */}
        <TabsContent value="today" className="mt-4">
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Coming Soon</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Today&apos;s activity summary
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Week View - Coming Soon */}
        <TabsContent value="week" className="mt-4">
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Coming Soon</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Weekly activity overview
              </p>
            </div>
          </div>
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
    </div>
  );
}
