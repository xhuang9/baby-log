/**
 * Mutation Push API Endpoint (Outbox Flush)
 *
 * Processes mutations from the client outbox and applies them to the database.
 * Records sync events for other clients to pull.
 *
 * Request Body:
 * {
 *   mutations: [
 *     { mutationId, entityType, entityId, op, payload }
 *   ]
 * }
 *
 * @see .readme/planning/03-sync-api-endpoints.md
 */

import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessSchema,
  feedLogSchema,
  nappyLogSchema,
  sleepLogSchema,
  syncEventsSchema,
  userSchema,
} from '@/models/Schema';

export const dynamic = 'force-dynamic';

type MutationOp = 'create' | 'update' | 'delete';
type EntityType = 'baby' | 'feed_log' | 'sleep_log' | 'nappy_log';

type Mutation = {
  mutationId: string;
  entityType: EntityType;
  entityId: string;
  op: MutationOp;
  payload: Record<string, unknown>;
};

type MutationResult = {
  mutationId: string;
  status: 'success' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
};

type PushRequest = {
  mutations: Mutation[];
};

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  let body: PushRequest;
  try {
    body = await request.json() as PushRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body.mutations || !Array.isArray(body.mutations)) {
    return NextResponse.json(
      { error: 'mutations array is required' },
      { status: 400 },
    );
  }

  if (body.mutations.length === 0) {
    return NextResponse.json({
      results: [],
      newCursor: null,
    });
  }

  try {
    // Get local user
    const [localUser] = await db
      .select({ id: userSchema.id })
      .from(userSchema)
      .where(eq(userSchema.clerkId, clerkId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Get all baby IDs user has edit access to
    const userAccess = await db
      .select({
        babyId: babyAccessSchema.babyId,
        accessLevel: babyAccessSchema.accessLevel,
      })
      .from(babyAccessSchema)
      .where(eq(babyAccessSchema.userId, localUser.id));

    const editableBabyIds = new Set(
      userAccess
        .filter(a => a.accessLevel === 'owner' || a.accessLevel === 'editor')
        .map(a => a.babyId),
    );

    // Process mutations
    const results: MutationResult[] = [];
    let newCursor: number | null = null;

    for (const mutation of body.mutations) {
      const result = await processMutation(
        mutation,
        localUser.id,
        editableBabyIds,
      );
      results.push(result);
    }

    // Get the latest cursor after all mutations
    const [latestEvent] = await db
      .select({ id: syncEventsSchema.id })
      .from(syncEventsSchema)
      .orderBy(syncEventsSchema.id)
      .limit(1);

    if (latestEvent) {
      newCursor = latestEvent.id;
    }

    return NextResponse.json({
      results,
      newCursor,
    });
  } catch (error) {
    console.error('Mutation push error:', error);
    return NextResponse.json(
      { error: 'Failed to process mutations' },
      { status: 500 },
    );
  }
}

async function processMutation(
  mutation: Mutation,
  userId: number,
  editableBabyIds: Set<number | null>,
): Promise<MutationResult> {
  const { mutationId, entityType, entityId, op, payload } = mutation;

  try {
    // Baby entities use entityId as the baby ID
    const babyId = entityType === 'baby'
      ? Number.parseInt(entityId, 10)
      : (payload.babyId as number | undefined);

    // Verify user has edit access
    if (entityType === 'baby') {
      // For baby mutations, check if user owns the baby or has editor access
      if (op !== 'create' && babyId && !editableBabyIds.has(babyId)) {
        console.error('[SYNC] Baby mutation access denied:', {
          babyId,
          op,
          userId,
          editableBabyIds: Array.from(editableBabyIds),
        });
        return {
          mutationId,
          status: 'error',
          error: 'Access denied to this baby',
        };
      }
    } else if (babyId && !editableBabyIds.has(babyId)) {
      // For other entities, verify access to the baby
      return {
        mutationId,
        status: 'error',
        error: 'Access denied to this baby',
      };
    }

    switch (entityType) {
      case 'baby':
        console.log('[SYNC] Processing baby mutation:', { mutationId, entityId, op, userId });
        return await processBabyMutation(mutationId, entityId, op, payload, userId);
      case 'feed_log':
        return await processFeedLogMutation(mutationId, entityId, op, payload, userId, babyId);
      case 'sleep_log':
        return await processSleepLogMutation(mutationId, entityId, op, payload, userId, babyId);
      case 'nappy_log':
        return await processNappyLogMutation(mutationId, entityId, op, payload, userId, babyId);
      default:
        return {
          mutationId,
          status: 'error',
          error: `Unknown entity type: ${entityType}`,
        };
    }
  } catch (error) {
    console.error(`Error processing mutation ${mutationId}:`, error);
    return {
      mutationId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function processBabyMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
): Promise<MutationResult> {
  const numericId = Number.parseInt(entityId, 10);

  if (op === 'create') {
    const [inserted] = await db
      .insert(babiesSchema)
      .values({
        name: payload.name as string,
        birthDate: payload.birthDate ? new Date(payload.birthDate as string) : null,
        gender: payload.gender as 'male' | 'female' | 'other' | 'unknown' | null,
        birthWeightG: payload.birthWeightG as number | null,
        ownerUserId: userId,
      })
      .returning();

    // Create owner access record
    await db.insert(babyAccessSchema).values({
      userId,
      babyId: inserted!.id,
      accessLevel: 'owner',
      defaultBaby: true,
      lastAccessedAt: new Date(),
    });

    // Record sync event
    await db.insert(syncEventsSchema).values({
      babyId: inserted!.id,
      entityType: 'baby',
      entityId: inserted!.id,
      op: 'create',
      payload: JSON.stringify(serializeBaby(inserted!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    // Check for conflict (LWW - server data wins if newer)
    const [existing] = await db
      .select()
      .from(babiesSchema)
      .where(eq(babiesSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Baby not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    // If server has newer data, return conflict
    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeBaby(existing),
      };
    }

    // Apply update
    console.log('[SYNC] Applying baby update to DB:', { numericId, name: payload.name });
    const [updated] = await db
      .update(babiesSchema)
      .set({
        name: payload.name as string,
        birthDate: payload.birthDate ? new Date(payload.birthDate as string) : null,
        gender: payload.gender as 'male' | 'female' | 'other' | 'unknown' | null,
        birthWeightG: payload.birthWeightG as number | null,
        archivedAt: payload.archivedAt ? new Date(payload.archivedAt as string) : null,
        updatedAt: new Date(),
      })
      .where(eq(babiesSchema.id, numericId))
      .returning();

    console.log('[SYNC] Baby updated successfully:', { id: updated?.id, name: updated?.name });

    // Record sync event
    await db.insert(syncEventsSchema).values({
      babyId: numericId,
      entityType: 'baby',
      entityId: numericId,
      op: 'update',
      payload: JSON.stringify(serializeBaby(updated!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    // Soft delete: set archivedAt
    const [existing] = await db
      .select()
      .from(babiesSchema)
      .where(eq(babiesSchema.id, numericId))
      .limit(1);

    if (!existing) {
      // Already deleted, consider success
      return { mutationId, status: 'success' };
    }

    const [archived] = await db
      .update(babiesSchema)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(babiesSchema.id, numericId))
      .returning();

    // Record sync event
    await db.insert(syncEventsSchema).values({
      babyId: numericId,
      entityType: 'baby',
      entityId: numericId,
      op: 'delete',
      payload: JSON.stringify(serializeBaby(archived!)),
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}

async function processFeedLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  const numericId = Number.parseInt(entityId, 10);

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(feedLogSchema)
      .values({
        babyId,
        loggedByUserId: userId,
        method: payload.method as string,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        amountMl: payload.amountMl as number | null,
        isEstimated: (payload.isEstimated as boolean) ?? false,
        estimatedSource: payload.estimatedSource as string | null,
        endSide: payload.endSide as string | null,
      })
      .returning();

    // Record sync event
    await db.insert(syncEventsSchema).values({
      babyId,
      entityType: 'feed_log',
      entityId: inserted!.id,
      op: 'create',
      payload: JSON.stringify(serializeFeedLog(inserted!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    // Check for conflict (LWW - server data wins if newer)
    const [existing] = await db
      .select()
      .from(feedLogSchema)
      .where(eq(feedLogSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Entity not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    // If server has newer data, return conflict
    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeFeedLog(existing),
      };
    }

    // Apply update
    const [updated] = await db
      .update(feedLogSchema)
      .set({
        method: payload.method as string,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        amountMl: payload.amountMl as number | null,
        isEstimated: (payload.isEstimated as boolean) ?? false,
        endSide: payload.endSide as string | null,
      })
      .where(eq(feedLogSchema.id, numericId))
      .returning();

    // Record sync event
    await db.insert(syncEventsSchema).values({
      babyId: existing.babyId,
      entityType: 'feed_log',
      entityId: numericId,
      op: 'update',
      payload: JSON.stringify(serializeFeedLog(updated!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: feedLogSchema.babyId })
      .from(feedLogSchema)
      .where(eq(feedLogSchema.id, numericId))
      .limit(1);

    if (!existing) {
      // Already deleted, consider success
      return { mutationId, status: 'success' };
    }

    await db.delete(feedLogSchema).where(eq(feedLogSchema.id, numericId));

    // Record sync event
    await db.insert(syncEventsSchema).values({
      babyId: existing.babyId,
      entityType: 'feed_log',
      entityId: numericId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}

async function processSleepLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  const numericId = Number.parseInt(entityId, 10);

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(sleepLogSchema)
      .values({
        babyId,
        loggedByUserId: userId,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        notes: payload.notes as string | null,
      })
      .returning();

    await db.insert(syncEventsSchema).values({
      babyId,
      entityType: 'sleep_log',
      entityId: inserted!.id,
      op: 'create',
      payload: JSON.stringify(serializeSleepLog(inserted!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(sleepLogSchema)
      .where(eq(sleepLogSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Entity not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeSleepLog(existing),
      };
    }

    const [updated] = await db
      .update(sleepLogSchema)
      .set({
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        notes: payload.notes as string | null,
      })
      .where(eq(sleepLogSchema.id, numericId))
      .returning();

    await db.insert(syncEventsSchema).values({
      babyId: existing.babyId,
      entityType: 'sleep_log',
      entityId: numericId,
      op: 'update',
      payload: JSON.stringify(serializeSleepLog(updated!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: sleepLogSchema.babyId })
      .from(sleepLogSchema)
      .where(eq(sleepLogSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(sleepLogSchema).where(eq(sleepLogSchema.id, numericId));

    await db.insert(syncEventsSchema).values({
      babyId: existing.babyId,
      entityType: 'sleep_log',
      entityId: numericId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}

async function processNappyLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  const numericId = Number.parseInt(entityId, 10);

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(nappyLogSchema)
      .values({
        babyId,
        loggedByUserId: userId,
        type: payload.type as 'wee' | 'poo' | 'mixed' | 'dry' | null,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .returning();

    await db.insert(syncEventsSchema).values({
      babyId,
      entityType: 'nappy_log',
      entityId: inserted!.id,
      op: 'create',
      payload: JSON.stringify(serializeNappyLog(inserted!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(nappyLogSchema)
      .where(eq(nappyLogSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Entity not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeNappyLog(existing),
      };
    }

    const [updated] = await db
      .update(nappyLogSchema)
      .set({
        type: payload.type as 'wee' | 'poo' | 'mixed' | 'dry' | null,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .where(eq(nappyLogSchema.id, numericId))
      .returning();

    await db.insert(syncEventsSchema).values({
      babyId: existing.babyId,
      entityType: 'nappy_log',
      entityId: numericId,
      op: 'update',
      payload: JSON.stringify(serializeNappyLog(updated!)),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: nappyLogSchema.babyId })
      .from(nappyLogSchema)
      .where(eq(nappyLogSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(nappyLogSchema).where(eq(nappyLogSchema.id, numericId));

    await db.insert(syncEventsSchema).values({
      babyId: existing.babyId,
      entityType: 'nappy_log',
      entityId: numericId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}

// Serialization helpers
function serializeBaby(baby: typeof babiesSchema.$inferSelect): Record<string, unknown> {
  return {
    id: baby.id,
    name: baby.name,
    birthDate: baby.birthDate?.toISOString() ?? null,
    gender: baby.gender,
    birthWeightG: baby.birthWeightG,
    archivedAt: baby.archivedAt?.toISOString() ?? null,
    ownerUserId: baby.ownerUserId,
    createdAt: baby.createdAt.toISOString(),
    updatedAt: baby.updatedAt?.toISOString() ?? baby.createdAt.toISOString(),
  };
}

function serializeFeedLog(log: typeof feedLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    method: log.method,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    durationMinutes: log.durationMinutes,
    amountMl: log.amountMl,
    isEstimated: log.isEstimated,
    endSide: log.endSide,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}

function serializeSleepLog(log: typeof sleepLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    durationMinutes: log.durationMinutes,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}

function serializeNappyLog(log: typeof nappyLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    type: log.type,
    startedAt: log.startedAt.toISOString(),
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
