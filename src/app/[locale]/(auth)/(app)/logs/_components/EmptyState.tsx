'use client';

import { Activity } from 'lucide-react';

export interface EmptyStateProps {
  hasAnyLogs?: boolean;
}

/**
 * Empty state for when no logs are found
 */
export function EmptyState({ hasAnyLogs = false }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-12">
      <Activity className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p className="text-center text-sm font-medium text-muted-foreground">
        {hasAnyLogs
          ? 'No logs match your filters'
          : 'No activity logs yet'}
      </p>
      <p className="text-center text-xs text-muted-foreground/75">
        {hasAnyLogs
          ? 'Try adjusting your filters to see more logs'
          : 'Start logging activities to see them here'}
      </p>
    </div>
  );
}
