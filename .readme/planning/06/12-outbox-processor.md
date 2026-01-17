# Task 12: Create Outbox Processor Service

**Status:** 🔜 DEFERRED - Performance priority achieved. Outbox pattern for offline mutations deferred.

**Prerequisite:** API routes exist (`/api/sync/push`)

## Goal

Create a service that processes the outbox queue, syncing local mutations to the server.

## Files to Create

### 1. `src/lib/sync/outbox-processor.ts`

```typescript
import { localDb } from '@/lib/local-db/database';
import type { OutboxEntry, OutboxStatus } from '@/lib/local-db/types/outbox';

const BATCH_SIZE = 10;
const RETRY_DELAY_MS = 5000;

type ProcessResult = {
  processed: number;
  failed: number;
  authError: boolean;
};

/**
 * Process pending outbox entries
 * Returns early if auth fails (401)
 */
export async function processOutbox(): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, failed: 0, authError: false };

  // Only process if online
  if (!navigator.onLine) {
    return result;
  }

  // Get pending entries
  const pendingEntries = await localDb.outbox
    .where('status')
    .equals('pending')
    .limit(BATCH_SIZE)
    .toArray();

  if (pendingEntries.length === 0) {
    return result;
  }

  for (const entry of pendingEntries) {
    // Mark as syncing
    await updateOutboxStatus(entry.mutationId, 'syncing');

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mutationId: entry.mutationId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          operation: entry.op,
          payload: entry.payload,
        }),
      });

      if (response.ok) {
        await updateOutboxStatus(entry.mutationId, 'synced');
        result.processed++;
      } else if (response.status === 401) {
        // Auth expired - stop processing
        await updateOutboxStatus(entry.mutationId, 'pending');
        result.authError = true;
        break;
      } else if (response.status === 409) {
        // Conflict - handle merge
        const serverData = await response.json();
        await handleConflict(entry, serverData);
        result.processed++;
      } else {
        // Other error
        await markOutboxFailed(entry.mutationId, `HTTP ${response.status}`);
        result.failed++;
      }
    } catch (error) {
      await markOutboxFailed(
        entry.mutationId,
        error instanceof Error ? error.message : 'Network error'
      );
      result.failed++;
    }
  }

  return result;
}

async function updateOutboxStatus(
  mutationId: string,
  status: OutboxStatus
): Promise<void> {
  await localDb.outbox.update(mutationId, { status });
}

async function markOutboxFailed(
  mutationId: string,
  errorMessage: string
): Promise<void> {
  await localDb.outbox.update(mutationId, {
    status: 'failed',
    lastAttemptAt: new Date(),
    errorMessage,
  });
}

/**
 * Handle conflict by accepting server version (LWW)
 */
async function handleConflict(
  entry: OutboxEntry,
  serverData: { serverVersion: unknown }
): Promise<void> {
  // Update local with server version
  const table = getTableForEntityType(entry.entityType);
  if (table && serverData.serverVersion) {
    await table.put(serverData.serverVersion);
  }

  // Mark as synced (server wins)
  await updateOutboxStatus(entry.mutationId, 'synced');
}

function getTableForEntityType(entityType: string) {
  switch (entityType) {
    case 'feed_log':
      return localDb.feedLogs;
    case 'sleep_log':
      return localDb.sleepLogs;
    case 'nappy_log':
      return localDb.nappyLogs;
    case 'baby':
      return localDb.babies;
    default:
      return null;
  }
}

/**
 * Get count of pending outbox entries
 */
export async function getPendingCount(): Promise<number> {
  return localDb.outbox.where('status').equals('pending').count();
}

/**
 * Retry failed entries (reset status to pending)
 */
export async function retryFailedEntries(): Promise<number> {
  const failed = await localDb.outbox
    .where('status')
    .equals('failed')
    .toArray();

  for (const entry of failed) {
    await localDb.outbox.update(entry.mutationId, {
      status: 'pending',
      errorMessage: null,
    });
  }

  return failed.length;
}
```

## Checklist

- [ ] Create `src/lib/sync/outbox-processor.ts`
- [ ] Verify `/api/sync/push` endpoint exists and handles the payload format
- [ ] Add conflict handling for 409 responses

## Notes

- Processor is stateless - can be called from anywhere
- Returns `authError: true` if 401 received (caller should handle)
- Uses LWW (Last-Write-Wins) for conflicts - server version wins
- Failed entries can be retried via `retryFailedEntries()`
