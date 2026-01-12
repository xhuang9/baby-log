'use client';

import { useRef } from 'react';
import { useOnlineStatusChange } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

type OfflineBannerProps = {
  className?: string;
};

/**
 * Banner component that shows when the user is offline.
 * Provides visual feedback about connectivity status.
 *
 * States:
 * - Hidden: When online
 * - Visible: When offline
 * - Reconnecting: When coming back online (briefly shown)
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  const reconnectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Use the callback-based hook to avoid direct setState in useEffect
  const isOnline = useOnlineStatusChange(
    // onOnline callback
    () => {
      if (bannerRef.current) {
        // Show reconnecting state
        bannerRef.current.dataset.reconnecting = 'true';
        bannerRef.current.dataset.offline = 'false';

        // Clear any existing timer
        if (reconnectingTimerRef.current) {
          clearTimeout(reconnectingTimerRef.current);
        }

        // Hide after 2 seconds
        reconnectingTimerRef.current = setTimeout(() => {
          if (bannerRef.current) {
            bannerRef.current.dataset.reconnecting = 'false';
          }
        }, 2000);
      }
    },
    // onOffline callback
    () => {
      if (bannerRef.current) {
        bannerRef.current.dataset.offline = 'true';
        bannerRef.current.dataset.reconnecting = 'false';
      }
    },
  );

  // Initial state based on current online status
  const initialOffline = !isOnline;

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      data-offline={initialOffline}
      data-reconnecting="false"
      className={cn(
        'fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
        // Hide by default, show when offline or reconnecting
        'data-[offline=false]:data-[reconnecting=false]:hidden',
        // Offline state styling
        'data-[offline=true]:bg-yellow-500 data-[offline=true]:text-yellow-950',
        // Reconnecting state styling
        'data-[reconnecting=true]:bg-green-500 data-[reconnecting=true]:text-white',
        className,
      )}
    >
      {/* Offline content */}
      <span className="contents data-[offline=false]:hidden" data-offline={initialOffline}>
        <svg
          className="size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-7.072 0m7.072 0l-2.829-2.829m2.829 2.829L9.172 15.17M12 12v.01"
          />
        </svg>
        <span>You&apos;re offline - changes will sync when reconnected</span>
      </span>

      {/* Reconnecting content - controlled via parent data attributes */}
      <span className="contents hidden" data-reconnecting-content>
        <svg
          className="size-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Back online - syncing...</span>
      </span>
    </div>
  );
}
