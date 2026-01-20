/**
 * Sync Service
 *
 * Client-side service for bidirectional data synchronization.
 * Handles pulling changes from server and pushing mutations from outbox.
 *
 * @see .readme/planning/03-sync-api-endpoints.md
 */

import type {
  FeedMethod,
  FeedSide,
  LocalBaby,
  LocalBabyAccess,
  LocalFeedLog,
  LocalNappyLog,
  LocalSleepLog,
  NappyType,
} from '@/lib/local-db';
import {
  clearSyncedOutboxEntries,
  deleteFeedLog,
  deleteNappyLog,
  deleteSleepLog,
  getPendingOutboxEntries,
  getSyncCursor,
  refreshAuthSession,
  saveBabies,
  saveBabyAccess,
  saveFeedLogs,
  saveNappyLogs,
  saveSleepLogs,
  updateOutboxStatus,
  updateSyncCursor,
} from '@/lib/local-db';

// ============================================================================
// Types
// ============================================================================

type SyncChange = {
  type: string;
  op: 'create' | 'update' | 'delete';
  id: number;
  data: Record<string, unknown> | null;
  createdAt: string;
};

type PullResponse = {
  changes: SyncChange[];
  nextCursor: number;
  hasMore: boolean;
};

type MutationResult = {
  mutationId: string;
  status: 'success' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
};

type PushResponse = {
  results: MutationResult[];
  newCursor: number | null;
};

type SyncResult = {
  success: boolean;
  error?: string;
  changesApplied?: number;
};

// ============================================================================
// Pull Changes
// ============================================================================

/**
 * Pull changes from server for a baby since the given cursor
 */
export async function pullChanges(babyId: number): Promise<SyncResult> {
  try {
    const cursor = await getSyncCursor(babyId);

    const response = await fetch(
      `/api/sync/pull?babyId=${babyId}&since=${cursor}&limit=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to pull changes: ${error}` };
    }

    const data: PullResponse = await response.json();

    // Apply changes to local database
    let changesApplied = 0;
    for (const change of data.changes) {
      await applyChange(change);
      changesApplied++;
    }

    // Update cursor
    if (data.nextCursor > cursor) {
      await updateSyncCursor(babyId, data.nextCursor);
    }

    // If there are more changes, continue pulling
    if (data.hasMore) {
      const moreResult = await pullChanges(babyId);
      if (moreResult.success && moreResult.changesApplied) {
        changesApplied += moreResult.changesApplied;
      }
    }

    return { success: true, changesApplied };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during pull',
    };
  }
}

/**
 * Apply a change from the server to the local database
 */
async function applyChange(change: SyncChange): Promise<void> {
  const { type, op, id, data } = change;

  switch (type) {
    case 'baby':
      await applyBabyChange(op, id, data);
      break;
    case 'feed_log':
      await applyFeedLogChange(op, id, data);
      break;
    case 'sleep_log':
      await applySleepLogChange(op, id, data);
      break;
    case 'nappy_log':
      await applyNappyLogChange(op, id, data);
      break;
    default:
      console.warn(`Unknown entity type: ${type}`);
  }
}

async function applyBabyChange(
  op: string,
  id: number,
  data: Record<string, unknown> | null,
): Promise<void> {
  // Baby deletion is soft delete (archivedAt), not hard delete
  if (op === 'delete') {
    // For soft delete, we need the baby data with archivedAt set
    if (!data) {
      console.warn(`Baby delete operation missing data for id ${id}`);
      return;
    }
  }

  if (!data) {
    return;
  }

  const baby: LocalBaby = {
    id: data.id as number,
    name: data.name as string,
    birthDate: data.birthDate ? new Date(data.birthDate as string) : null,
    gender: (data.gender as 'male' | 'female' | 'other' | 'unknown' | null) ?? null,
    birthWeightG: (data.birthWeightG as number | null) ?? null,
    archivedAt: data.archivedAt ? new Date(data.archivedAt as string) : null,
    ownerUserId: data.ownerUserId as number,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveBabies([baby]);

  // If babyAccess data is included, save it too
  if (data.access && Array.isArray(data.access)) {
    const accessRecords: LocalBabyAccess[] = (data.access as Array<Record<string, unknown>>).map(
      (acc) => ({
        userId: acc.userId as number,
        babyId: acc.babyId as number,
        accessLevel: acc.accessLevel as 'owner' | 'editor' | 'viewer',
        caregiverLabel: acc.caregiverLabel as string | null,
        lastAccessedAt: acc.lastAccessedAt ? new Date(acc.lastAccessedAt as string) : null,
        createdAt: new Date(acc.createdAt as string),
        updatedAt: new Date(acc.updatedAt as string),
      })
    );
    await saveBabyAccess(accessRecords);
  }
}

async function applyFeedLogChange(
  op: string,
  id: number,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deleteFeedLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const feedLog: LocalFeedLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    method: data.method as FeedMethod,
    startedAt: new Date(data.startedAt as string),
    endedAt: data.endedAt ? new Date(data.endedAt as string) : null,
    durationMinutes: data.durationMinutes as number | null,
    amountMl: data.amountMl as number | null,
    isEstimated: data.isEstimated as boolean,
    endSide: data.endSide as FeedSide | null,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveFeedLogs([feedLog]);
}

async function applySleepLogChange(
  op: string,
  id: number,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deleteSleepLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const sleepLog: LocalSleepLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    startedAt: new Date(data.startedAt as string),
    endedAt: data.endedAt ? new Date(data.endedAt as string) : null,
    durationMinutes: data.durationMinutes as number | null,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveSleepLogs([sleepLog]);
}

async function applyNappyLogChange(
  op: string,
  id: number,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deleteNappyLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const nappyLog: LocalNappyLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    type: data.type as NappyType | null,
    startedAt: new Date(data.startedAt as string),
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveNappyLogs([nappyLog]);
}

// ============================================================================
// Flush Outbox
// ============================================================================

/**
 * Flush pending mutations from the outbox to the server
 */
export async function flushOutbox(): Promise<SyncResult> {
  try {
    const pending = await getPendingOutboxEntries();

    if (pending.length === 0) {
      return { success: true, changesApplied: 0 };
    }

    // Mark as syncing
    await Promise.all(
      pending.map(e => updateOutboxStatus(e.mutationId, 'syncing')),
    );

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mutations: pending.map(e => ({
          mutationId: e.mutationId,
          entityType: e.entityType,
          entityId: e.entityId,
          op: e.op,
          payload: e.payload,
        })),
      }),
    });

    if (!response.ok) {
      // Network error, keep as pending for retry
      await Promise.all(
        pending.map(e => updateOutboxStatus(e.mutationId, 'pending')),
      );
      const error = await response.text();
      return { success: false, error: `Failed to push mutations: ${error}` };
    }

    const { results, newCursor }: PushResponse = await response.json();

    let changesApplied = 0;

    for (const result of results) {
      if (result.status === 'success') {
        await updateOutboxStatus(result.mutationId, 'synced');
        changesApplied++;
      } else if (result.status === 'conflict') {
        // LWW: server wins, update local with server data
        if (result.serverData) {
          await applyServerData(result.serverData);
        }
        await updateOutboxStatus(result.mutationId, 'synced');
        changesApplied++;
      } else {
        // Error
        await updateOutboxStatus(
          result.mutationId,
          'failed',
          result.error ?? 'Unknown error',
        );
      }
    }

    // Update sync cursor if provided
    if (newCursor) {
      // Get the first baby ID from pending mutations for cursor update
      const firstBabyId = pending[0]?.payload as Record<string, unknown> | undefined;
      if (firstBabyId?.babyId) {
        await updateSyncCursor(firstBabyId.babyId as number, newCursor);
      }
    }

    // Clear synced entries
    await clearSyncedOutboxEntries();

    return { success: true, changesApplied };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during push',
    };
  }
}

// ============================================================================
// Apply Server Data (for conflict resolution)
// ============================================================================

/**
 * Apply server data to local database (for conflict resolution - LWW)
 */
export async function applyServerData(
  serverData: Record<string, unknown>,
): Promise<void> {
  // Determine entity type from the data structure
  if ('name' in serverData && 'ownerUserId' in serverData && !('babyId' in serverData)) {
    // Baby (has 'name' and 'ownerUserId' but no 'babyId' field)
    const baby: LocalBaby = {
      id: serverData.id as number,
      name: serverData.name as string,
      birthDate: serverData.birthDate ? new Date(serverData.birthDate as string) : null,
      gender: (serverData.gender as 'male' | 'female' | 'other' | 'unknown' | null) ?? null,
      birthWeightG: (serverData.birthWeightG as number | null) ?? null,
      archivedAt: serverData.archivedAt ? new Date(serverData.archivedAt as string) : null,
      ownerUserId: serverData.ownerUserId as number,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveBabies([baby]);

    // If babyAccess data is included, save it too
    if (serverData.access && Array.isArray(serverData.access)) {
      const accessRecords: LocalBabyAccess[] = (serverData.access as Array<Record<string, unknown>>).map(
        (acc) => ({
          userId: acc.userId as number,
          babyId: acc.babyId as number,
          accessLevel: acc.accessLevel as 'owner' | 'editor' | 'viewer',
          caregiverLabel: acc.caregiverLabel as string | null,
          lastAccessedAt: acc.lastAccessedAt ? new Date(acc.lastAccessedAt as string) : null,
          createdAt: new Date(acc.createdAt as string),
          updatedAt: new Date(acc.updatedAt as string),
        })
      );
      await saveBabyAccess(accessRecords);
    }
  } else if ('method' in serverData) {
    // Feed log
    const feedLog: LocalFeedLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      method: serverData.method as FeedMethod,
      startedAt: new Date(serverData.startedAt as string),
      endedAt: serverData.endedAt ? new Date(serverData.endedAt as string) : null,
      durationMinutes: serverData.durationMinutes as number | null,
      amountMl: serverData.amountMl as number | null,
      isEstimated: serverData.isEstimated as boolean,
      endSide: serverData.endSide as FeedSide | null,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveFeedLogs([feedLog]);
  } else if ('type' in serverData && serverData.type !== undefined) {
    // Nappy log (has 'type' field for nappy type)
    const nappyLog: LocalNappyLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      type: serverData.type as NappyType | null,
      startedAt: new Date(serverData.startedAt as string),
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveNappyLogs([nappyLog]);
  } else if ('startedAt' in serverData && 'endedAt' in serverData) {
    // Sleep log
    const sleepLog: LocalSleepLog = {
      id: serverData.id as string,
      babyId: serverData.babyId as number,
      loggedByUserId: serverData.loggedByUserId as number,
      startedAt: new Date(serverData.startedAt as string),
      endedAt: serverData.endedAt ? new Date(serverData.endedAt as string) : null,
      durationMinutes: serverData.durationMinutes as number | null,
      notes: (serverData.notes as string) ?? null,
      createdAt: new Date(serverData.createdAt as string),
      updatedAt: new Date(serverData.updatedAt as string),
    };
    await saveSleepLogs([sleepLog]);
  }
}

// ============================================================================
// Full Sync (Pull + Push)
// ============================================================================

/**
 * Perform a full sync for all accessible babies
 */
export async function performFullSync(babyIds: number[]): Promise<SyncResult> {
  try {
    // First, flush outbox to push any pending changes
    const pushResult = await flushOutbox();
    if (!pushResult.success) {
      console.warn('Outbox flush failed:', pushResult.error);
      // Continue with pull even if push fails
    }

    // Then, pull changes for each baby
    let totalChanges = pushResult.changesApplied ?? 0;

    for (const babyId of babyIds) {
      const pullResult = await pullChanges(babyId);
      if (pullResult.success && pullResult.changesApplied) {
        totalChanges += pullResult.changesApplied;
      }
    }

    // Refresh auth session on successful sync (extends offline access window)
    if (totalChanges > 0 || pushResult.success) {
      try {
        await refreshAuthSession();
      } catch (e) {
        // Non-critical: don't fail sync if session refresh fails
        console.warn('Failed to refresh auth session:', e);
      }
    }

    return { success: true, changesApplied: totalChanges };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync',
    };
  }
}
