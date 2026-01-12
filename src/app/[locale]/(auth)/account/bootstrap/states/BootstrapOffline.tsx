'use client';

import { CloudOff, RefreshCw, Wifi } from 'lucide-react';

type BootstrapOfflineProps = {
  lastSyncedAt: string;
  onRetry: () => void;
};

export function BootstrapOffline(props: BootstrapOfflineProps) {
  const { lastSyncedAt, onRetry } = props;

  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'just now';
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
          <CloudOff className="h-12 w-12 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Offline Mode</h1>
        <p className="text-sm text-muted-foreground">
          You're currently offline. Using cached data from
          {' '}
          {formatLastSync(lastSyncedAt)}
          .
        </p>
      </div>

      <div className="rounded-md bg-amber-50 p-4 text-left dark:bg-amber-900/10">
        <div className="flex items-start gap-3">
          <Wifi className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Limited functionality
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Changes made offline will sync when you reconnect.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <RefreshCw className="h-4 w-4" />
        Try to Reconnect
      </button>
    </div>
  );
}
