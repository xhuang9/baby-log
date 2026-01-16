# Task 13: Create Sync Scheduler

**Status:** [ ] Not started

**Prerequisite:** Task 12 (Outbox Processor)

## Goal

Create a scheduler that:
1. Runs outbox processor periodically when online
2. Triggers on network reconnection
3. Triggers when app becomes visible (returning user)

## Files to Create

### 1. `src/lib/sync/sync-scheduler.ts`

```typescript
import { processOutbox, getPendingCount } from './outbox-processor';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const RECONNECT_DELAY_MS = 2_000; // 2 seconds after reconnect

let intervalId: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/**
 * Start the sync scheduler
 * Call once on app mount
 */
export function startSyncScheduler(): void {
  if (typeof window === 'undefined') return;

  // Periodic sync
  intervalId = setInterval(runSync, SYNC_INTERVAL_MS);

  // Sync on reconnect
  window.addEventListener('online', handleOnline);

  // Sync when returning to app
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Initial sync
  runSync();
}

/**
 * Stop the sync scheduler
 * Call on unmount
 */
export function stopSyncScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
}

async function runSync(): Promise<void> {
  // Prevent concurrent runs
  if (isProcessing) return;
  if (!navigator.onLine) return;

  isProcessing = true;

  try {
    const result = await processOutbox();

    if (result.authError) {
      // Auth expired - could emit event or redirect
      console.warn('[SyncScheduler] Auth expired, stopping sync');
      // Optionally: window.location.href = '/sign-in';
    }

    if (result.processed > 0) {
      console.log(`[SyncScheduler] Synced ${result.processed} entries`);
    }
  } catch (error) {
    console.error('[SyncScheduler] Sync error:', error);
  } finally {
    isProcessing = false;
  }
}

function handleOnline(): void {
  // Delay slightly to ensure connection is stable
  setTimeout(runSync, RECONNECT_DELAY_MS);
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    runSync();
  }
}
```

### 2. `src/components/providers/SyncProvider.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { startSyncScheduler, stopSyncScheduler } from '@/lib/sync/sync-scheduler';

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    startSyncScheduler();
    return () => stopSyncScheduler();
  }, []);

  return <>{children}</>;
}
```

### 3. Add to app layout

In `src/app/[locale]/(auth)/(app)/layout.tsx` or root layout:

```typescript
import { SyncProvider } from '@/components/providers/SyncProvider';

export default function Layout({ children }) {
  return (
    <SyncProvider>
      {children}
    </SyncProvider>
  );
}
```

## Checklist

- [ ] Create `src/lib/sync/sync-scheduler.ts`
- [ ] Create `src/components/providers/SyncProvider.tsx`
- [ ] Add `SyncProvider` to app layout
- [ ] Test: Create local mutation → wait 30s → check if synced
- [ ] Test: Go offline → create mutation → go online → check if synced

## Optional: Sync Status Hook

```typescript
// src/hooks/useSyncStatus.ts
import { useState, useEffect } from 'react';
import { getPendingCount } from '@/lib/sync/outbox-processor';

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, isSynced: pendingCount === 0 };
}
```

## Notes

- Scheduler is singleton - only one instance runs
- Prevents concurrent processing with `isProcessing` flag
- Automatically retries on reconnection
- Can be extended with exponential backoff for failed entries
