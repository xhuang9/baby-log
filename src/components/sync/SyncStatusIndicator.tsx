/**
 * Sync Status Indicator
 *
 * Visual indicator showing the current sync status.
 * Displays in the header or as a floating indicator.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import { AlertCircle, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOverallSyncStatus, useSyncStore } from '@/stores/useSyncStore';

type SyncStatusIndicatorProps = {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const labelSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function SyncStatusIndicator({
  className,
  showLabel = false,
  size = 'md',
}: SyncStatusIndicatorProps) {
  const status = useOverallSyncStatus();
  const backgroundSync = useSyncStore(s => s.backgroundSync);

  const iconClass = sizeClasses[size];
  const labelClass = labelSizeClasses[size];

  const getStatusInfo = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <Loader2 className={cn(iconClass, 'animate-spin text-blue-500')} />,
          label: backgroundSync.totalBabies > 0
            ? `Syncing ${backgroundSync.completedBabies}/${backgroundSync.totalBabies}`
            : 'Syncing...',
          color: 'text-blue-500',
        };
      case 'complete':
        return {
          icon: <Cloud className={cn(iconClass, 'text-green-500')} />,
          label: 'Synced',
          color: 'text-green-500',
        };
      case 'error':
        return {
          icon: <AlertCircle className={cn(iconClass, 'text-red-500')} />,
          label: 'Sync error',
          color: 'text-red-500',
        };
      default:
        return {
          icon: <CloudOff className={cn(iconClass, 'text-gray-400')} />,
          label: 'Offline',
          color: 'text-gray-400',
        };
    }
  };

  const { icon, label, color } = getStatusInfo();

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {icon}
      {showLabel && (
        <span className={cn(labelClass, color)}>
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Compact sync indicator for use in headers/navigation
 */
export function SyncStatusDot({ className }: { className?: string }) {
  const status = useOverallSyncStatus();

  const dotColor = {
    syncing: 'bg-blue-500 animate-pulse',
    complete: 'bg-green-500',
    error: 'bg-red-500',
    idle: 'bg-gray-400',
  }[status];

  const titleMap = {
    syncing: 'Syncing...',
    complete: 'Synced',
    error: 'Sync error',
    idle: 'Offline',
  };

  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full',
        dotColor,
        className,
      )}
      title={titleMap[status]}
    />
  );
}

/**
 * Full sync status banner for displaying sync progress
 */
export function SyncStatusBanner({ className }: { className?: string }) {
  const status = useOverallSyncStatus();
  const backgroundSync = useSyncStore(s => s.backgroundSync);

  if (status === 'complete' || status === 'idle') {
    return null;
  }

  const isSyncing = status === 'syncing';
  const bgColor = isSyncing ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700';
  const syncMessage = backgroundSync.totalBabies > 0
    ? `Syncing historical data... (${backgroundSync.completedBabies}/${backgroundSync.totalBabies} babies)`
    : 'Syncing data...';

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-2',
        bgColor,
        className,
      )}
    >
      {isSyncing && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{syncMessage}</span>
        </>
      )}
      {!isSyncing && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            {backgroundSync.error ?? 'Sync failed. Please try again.'}
          </span>
        </>
      )}
    </div>
  );
}
