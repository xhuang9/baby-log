/**
 * Delta Sync Pull API Endpoint
 *
 * Returns changes since a given cursor for a specific baby.
 * Uses cursor-based pagination with sync_events table.
 *
 * Query Parameters:
 * - babyId: number (required) - The baby to fetch changes for
 * - since: number (optional) - Cursor to fetch changes after (sync_events.id)
 * - limit: number (optional) - Number of changes to fetch (default: 100, max: 500)
 *
 * @see .readme/planning/03-sync-api-endpoints.md
 */

import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  babyAccessSchema,
  syncEventsSchema,
  userSchema,
} from '@/models/Schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const babyIdParam = searchParams.get('babyId');
  const sinceParam = searchParams.get('since');
  const limitParam = searchParams.get('limit');

  if (!babyIdParam) {
    return NextResponse.json(
      { error: 'babyId is required' },
      { status: 400 },
    );
  }

  const babyId = Number.parseInt(babyIdParam, 10);
  if (Number.isNaN(babyId)) {
    return NextResponse.json(
      { error: 'babyId must be a number' },
      { status: 400 },
    );
  }

  const limit = Math.min(
    Math.max(1, Number.parseInt(limitParam ?? '100', 10) || 100),
    500,
  );

  const sinceCursor = sinceParam ? Number.parseInt(sinceParam, 10) : 0;

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

    // Verify user has access to this baby
    const [access] = await db
      .select({ babyId: babyAccessSchema.babyId })
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.userId, localUser.id),
          eq(babyAccessSchema.babyId, babyId),
        ),
      )
      .limit(1);

    if (!access) {
      return NextResponse.json(
        { error: 'Access denied to this baby' },
        { status: 403 },
      );
    }

    // Build query conditions
    const conditions = [eq(syncEventsSchema.babyId, babyId)];

    if (sinceCursor > 0) {
      conditions.push(gt(syncEventsSchema.id, sinceCursor));
    }

    // Fetch changes with one extra to determine hasMore
    const changes = await db
      .select({
        id: syncEventsSchema.id,
        entityType: syncEventsSchema.entityType,
        entityId: syncEventsSchema.entityId,
        op: syncEventsSchema.op,
        payload: syncEventsSchema.payload,
        createdAt: syncEventsSchema.createdAt,
      })
      .from(syncEventsSchema)
      .where(and(...conditions))
      .orderBy(syncEventsSchema.id)
      .limit(limit + 1);

    // Check if there are more results
    const hasMore = changes.length > limit;
    const resultChanges = hasMore ? changes.slice(0, limit) : changes;

    // Get next cursor (the ID of the last change in results)
    const nextCursor = resultChanges.length > 0
      ? resultChanges[resultChanges.length - 1]?.id ?? sinceCursor
      : sinceCursor;

    // Build response
    const response = {
      changes: resultChanges.map(change => ({
        type: change.entityType,
        op: change.op,
        id: change.entityId,
        data: change.payload ? JSON.parse(change.payload) : null,
        createdAt: change.createdAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Delta sync pull error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changes' },
      { status: 500 },
    );
  }
}
