/**
 * Sync Events Helper
 *
 * Centralized helper for writing sync events to the database.
 * Used by server actions and API routes to record mutations for syncing.
 */

import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { syncEventsSchema } from '@/models/Schema';

type EntityType = 'baby' | 'feed_log' | 'sleep_log' | 'nappy_log' | 'solids_log' | 'pumping_log' | 'growth_log';
type SyncOp = 'create' | 'update' | 'delete';

export type WriteSyncEventParams = {
  babyId: number;
  entityType: EntityType;
  entityId: number | string; // Can be number (old data, baby IDs) or string (UUID for logs)
  op: SyncOp;
  payload: Record<string, unknown> | null;
};

/**
 * Write a sync event to the database
 * @returns The ID of the created sync event
 */
export async function writeSyncEvent(params: WriteSyncEventParams): Promise<number> {
  const [result] = await db.insert(syncEventsSchema).values({
    babyId: params.babyId,
    entityType: params.entityType,
    entityId: String(params.entityId), // Convert to string for database
    op: params.op,
    payload: params.payload ? JSON.stringify(params.payload) : null,
  }).returning({ id: syncEventsSchema.id });

  if (!result) {
    throw new Error('Failed to create sync event');
  }

  return result.id;
}

/**
 * Get the latest sync cursor
 * (highest sync event ID) for a baby
 * Used when granting new access to initialize the cursor so the user
 * doesn't pull the entire sync history.
 *
 * @returns The latest sync event ID for the baby, or 0 if none exist
 */
export async function getLatestSyncCursor(babyId: number): Promise<number> {
  const [latest] = await db
    .select({ id: syncEventsSchema.id })
    .from(syncEventsSchema)
    .where(eq(syncEventsSchema.babyId, babyId))
    .orderBy(desc(syncEventsSchema.id))
    .limit(1);

  return latest?.id ?? 0;
}

/**
 * Get the latest global sync cursor
 * (highest sync event ID across all babies)
 * Used by push endpoint after processing mutations.
 *
 * @returns The latest sync event ID globally, or null if none exist
 */
export async function getLatestGlobalSyncCursor(): Promise<number | null> {
  const [latest] = await db
    .select({ id: syncEventsSchema.id })
    .from(syncEventsSchema)
    .orderBy(desc(syncEventsSchema.id))
    .limit(1);

  return latest?.id ?? null;
}
