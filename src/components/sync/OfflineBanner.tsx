'use client';

/**
 * Offline Banner Component
 *
 * Displays a banner when the user is offline or using stale data.
 *
 * @see .readme/planning/02-offline-first-architecture.md
 */

import { CloudOff, RefreshCw, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useOnlineStatusChange } from '@/hooks/useOnlineStatus';

type OfflineBannerProps = {
  lastSyncedAt?: Date | null;
  onSync?: () => void;
  dismissible?: boolean;
};

export function OfflineBanner(props: OfflineBannerProps) {
  const { lastSyncedAt, onSync, dismissible = true } = props;
  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOnline = useCallback(() => {
    // Show reconnected message briefly
    setShowReconnected(true);
    timerRef.current = setTimeout(() => {
      setShowReconnected(false);
    }, 3000);
  }, []);

  const handleOffline = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Reset dismissed state when going offline
    setIsDismissed(false);
    setShowReconnected(false);
  }, []);

  const isOnline = useOnlineStatusChange(handleOnline, handleOffline);

  const formatLastSync = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'just now';
    }
    if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
    }
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }, []);

  // Don't show if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-4 sm:w-auto">
        <div className="flex items-center gap-3 rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg">
          <RefreshCw className="h-5 w-5" />
          <span className="text-sm font-medium">Back online</span>
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              className="ml-2 rounded-md bg-white/20 px-2 py-1 text-xs font-medium hover:bg-white/30"
            >
              Sync now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show offline banner
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:right-4 sm:w-auto">
      <div className="flex items-center gap-3 rounded-lg bg-amber-600 px-4 py-3 text-white shadow-lg">
        <CloudOff className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <span className="text-sm font-medium">You're offline</span>
          {lastSyncedAt && (
            <span className="ml-1 text-xs opacity-80">
              (synced
              {' '}
              {formatLastSync(lastSyncedAt)}
              )
            </span>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="rounded-md p-1 hover:bg-white/20"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
