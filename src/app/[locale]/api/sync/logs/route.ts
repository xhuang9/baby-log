/**
 * Delta Sync Logs API Endpoint
 *
 * Returns paginated feed logs for background sync.
 * Uses cursor-based pagination for efficient historical data fetching.
 *
 * Query Parameters:
 * - babyId: number (required) - The baby to fetch logs for
 * - before: string (optional) - Cursor for pagination (ISO timestamp, fetch logs before this time)
 * - limit: number (optional) - Number of logs to fetch (default: 100, max: 500)
 *
 * @see .readme/planning/01-state-management-sync.md
 * @see .readme/planning/03-sync-api-endpoints.md
 */

import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  babyAccessSchema,
  feedLogSchema,
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
  const beforeParam = searchParams.get('before');
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

  const beforeCursor = beforeParam ? new Date(beforeParam) : null;

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
    const conditions = [eq(feedLogSchema.babyId, babyId)];

    if (beforeCursor !== null && !Number.isNaN(beforeCursor.getTime())) {
      conditions.push(lt(feedLogSchema.createdAt, beforeCursor));
    }

    // Fetch logs with one extra to determine hasMore
    const logs = await db
      .select({
        id: feedLogSchema.id,
        babyId: feedLogSchema.babyId,
        loggedByUserId: feedLogSchema.loggedByUserId,
        method: feedLogSchema.method,
        startedAt: feedLogSchema.startedAt,
        endedAt: feedLogSchema.endedAt,
        durationMinutes: feedLogSchema.durationMinutes,
        amountMl: feedLogSchema.amountMl,
        isEstimated: feedLogSchema.isEstimated,
        endSide: feedLogSchema.endSide,
        createdAt: feedLogSchema.createdAt,
        updatedAt: feedLogSchema.updatedAt,
      })
      .from(feedLogSchema)
      .where(and(...conditions))
      .orderBy(desc(feedLogSchema.createdAt))
      .limit(limit + 1);

    // Check if there are more results
    const hasMore = logs.length > limit;
    const resultLogs = hasMore ? logs.slice(0, limit) : logs;

    // Get next cursor (the createdAt timestamp of the last log in results)
    const nextCursor = resultLogs.length > 0
      ? resultLogs[resultLogs.length - 1]?.createdAt.toISOString() ?? null
      : null;

    // Build response
    const response = {
      logs: resultLogs.map(log => ({
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
        notes: null, // Reserved for future use
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Delta sync logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 },
    );
  }
}
