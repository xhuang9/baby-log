/**
 * Online Status Hook
 *
 * Tracks the browser's online/offline status with reactive updates.
 *
 * @see .readme/planning/02-offline-first-architecture.md
 */

'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

// ============================================================================
// Store for online status
// ============================================================================

let listeners: Array<() => void> = [];
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

function subscribe(callback: () => void) {
  listeners.push(callback);

  const handleOnline = () => {
    isOnline = true;
    listeners.forEach(listener => listener());
  };

  const handleOffline = () => {
    isOnline = false;
    listeners.forEach(listener => listener());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    listeners = listeners.filter(l => l !== callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
}

function getSnapshot() {
  return isOnline;
}

function getServerSnapshot() {
  return true; // Assume online on server
}

// ============================================================================
// Hook
// ============================================================================

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ============================================================================
// Additional utilities
// ============================================================================

/**
 * Hook that calls a callback when online status changes
 */
export function useOnlineStatusChange(
  onOnline?: () => void,
  onOffline?: () => void,
) {
  const online = useOnlineStatus();

  const handleOnline = useCallback(() => {
    onOnline?.();
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    onOffline?.();
  }, [onOffline]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return online;
}
