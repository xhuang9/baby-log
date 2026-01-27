'use client';

import type { UnifiedLog } from '@/lib/format-log';
import { Skeleton } from '@/components/ui/skeleton';
import { groupLogsByDate } from '@/lib/format-log';
import { EmptyState } from './EmptyState';
import { LogItem } from './LogItem';

export type LogsListProps = {
  logs: UnifiedLog[] | undefined;
  hasAnyLogs?: boolean;
  onEditLog?: (log: UnifiedLog) => void;
};

/**
 * Displays all activity logs grouped by date
 * Shows loading skeleton while logs are being fetched
 * Shows empty state when no logs match filters
 * Always 2-column grid on desktop, single column on mobile
 */
export function LogsList({ logs, hasAnyLogs = false, onEditLog }: LogsListProps) {
  // Loading state - show skeleton grid
  if (logs === undefined) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <Skeleton className="h-4 w-20 rounded" />
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return <EmptyState hasAnyLogs={hasAnyLogs} />;
  }

  // Group logs by date
  const groups = groupLogsByDate(logs);

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group.label}>
          {/* Date header */}
          <h3 className="mb-2.5 text-sm font-semibold text-muted-foreground">
            {group.label}
          </h3>

          {/* Log items in grid: 2 columns on desktop, single column on mobile */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {group.logs.map(log => (
              <LogItem
                key={log.id}
                log={log}
                onClick={onEditLog}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
