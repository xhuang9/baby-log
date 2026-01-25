'use client';

import type { ViewMode } from './LogsFilters';
import type { UnifiedLog } from '@/lib/format-log';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { useAllActivityLogs } from '@/hooks/useAllActivityLogs';
import { useLogsFilters } from '@/hooks/useLogsFilters';
import { localDb } from '@/lib/local-db';
import { EditFeedModal } from './edit-modals/EditFeedModal';
import { EditSleepModal } from './edit-modals/EditSleepModal';
import { LogsFilters } from './LogsFilters';
import { LogsList } from './LogsList';

/**
 * Main orchestrator component for the activity logs page
 * Manages filter state, view mode, and modal state, coordinates display components
 */
export function LogsContent() {
  // Get current user and their default baby from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  const babyId = userData?.defaultBabyId ?? null;

  const [editingLog, setEditingLog] = useState<UnifiedLog | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('simplified');

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
    <div className="space-y-6">
      {/* Filter controls */}
      <LogsFilters
        activeTypes={activeTypes}
        setActiveTypes={setActiveTypes}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Logs list */}
      <LogsList
        logs={allLogs}
        hasAnyLogs={Boolean(allLogs && allLogs.length > 0)}
        onEditLog={handleOpenEditModal}
        viewMode={viewMode}
      />

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
