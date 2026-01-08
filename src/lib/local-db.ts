/**
 * Local-First Database (Dexie/IndexedDB)
 *
 * This is the immediate read model for the dashboard UI.
 * Server (Postgres) remains the canonical truth.
 *
 * Architecture:
 * - UI reads from IndexedDB first (instant)
 * - TanStack Query schedules sync pulls
 * - Server changes are applied to IndexedDB
 * - Conflicts resolved via Last-Write-Wins (LWW)
 *
 * @see .readme/task/llm-chat.md for architecture decisions
 * @see .readme/task/llm-chat-correction.md for LWW/outbox details
 */

import type { EntityTable } from 'dexie';
import Dexie from 'dexie';

// ============================================================================
// Types (mirrors server schema for sync)
// ============================================================================

export type FeedMethod = 'breast' | 'bottle';
export type FeedSide = 'left' | 'right';

export type LocalFeedLog = {
  id: string; // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  method: FeedMethod;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  amountMl: number | null;
  isEstimated: boolean;
  endSide: FeedSide | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LocalBaby = {
  id: number;
  name: string;
  birthDate: Date | null;
  gender: 'male' | 'female' | null;
  archivedAt: Date | null;
};

export type LocalBabyAccess = {
  userId: number;
  babyId: number;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
};

// ============================================================================
// Sync Metadata
// ============================================================================

export type SyncMeta = {
  babyId: number; // Primary key
  cursor: number; // Monotonic cursor for delta sync
  lastSyncAt: Date;
};

// ============================================================================
// Outbox for Offline Mutations
// ============================================================================

export type OutboxEntityType = 'feed_log' | 'sleep_log' | 'baby';
export type OutboxOperation = 'create' | 'update' | 'delete';
export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type OutboxEntry = {
  mutationId: string; // UUID, unique
  entityType: OutboxEntityType;
  entityId: string; // UUID of the entity
  op: OutboxOperation;
  payload: unknown; // Full row or patch
  createdAt: Date;
  status: OutboxStatus;
  lastAttemptAt: Date | null;
  errorMessage: string | null;
};

// ============================================================================
// Dexie Database Class
// ============================================================================

class BabyLogDatabase extends Dexie {
  feedLogs!: EntityTable<LocalFeedLog, 'id'>;
  babies!: EntityTable<LocalBaby, 'id'>;
  babyAccess!: EntityTable<LocalBabyAccess, 'userId'>;
  syncMeta!: EntityTable<SyncMeta, 'babyId'>;
  outbox!: EntityTable<OutboxEntry, 'mutationId'>;

  constructor() {
    super('baby-log');

    this.version(1).stores({
      // Feed logs - indexed for queries by baby and time
      feedLogs: 'id, babyId, startedAt, createdAt',
      // Babies - simple id lookup
      babies: 'id',
      // Baby access - compound index for user+baby lookup
      babyAccess: '[userId+babyId], userId, babyId',
      // Sync metadata - one entry per baby
      syncMeta: 'babyId',
      // Outbox - for offline mutation replay
      outbox: 'mutationId, status, createdAt, entityType',
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const localDb = new BabyLogDatabase();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get pending outbox entries for sync
 */
export async function getPendingOutboxEntries(): Promise<OutboxEntry[]> {
  return localDb.outbox.where('status').equals('pending').toArray();
}

/**
 * Add a mutation to the outbox
 */
export async function addToOutbox(
  entry: Omit<OutboxEntry, 'createdAt' | 'status' | 'lastAttemptAt' | 'errorMessage'>,
): Promise<void> {
  await localDb.outbox.add({
    ...entry,
    createdAt: new Date(),
    status: 'pending',
    lastAttemptAt: null,
    errorMessage: null,
  });
}

/**
 * Update outbox entry status
 */
export async function updateOutboxStatus(
  mutationId: string,
  status: OutboxStatus,
  errorMessage?: string,
): Promise<void> {
  await localDb.outbox.update(mutationId, {
    status,
    lastAttemptAt: new Date(),
    errorMessage: errorMessage ?? null,
  });
}

/**
 * Get sync cursor for a baby
 */
export async function getSyncCursor(babyId: number): Promise<number> {
  const meta = await localDb.syncMeta.get(babyId);
  return meta?.cursor ?? 0;
}

/**
 * Update sync cursor for a baby
 */
export async function updateSyncCursor(
  babyId: number,
  cursor: number,
): Promise<void> {
  await localDb.syncMeta.put({
    babyId,
    cursor,
    lastSyncAt: new Date(),
  });
}
