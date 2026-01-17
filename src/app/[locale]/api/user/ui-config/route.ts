/**
 * User UI Config API Endpoint
 *
 * GET: Fetch current UI config for the authenticated user
 * POST: Update UI config with per-key LWW merge
 *
 * @see .readme/planning/05-ui-config-sync.md
 */

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userSchema, userUiConfigSchema } from '@/models/Schema';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

type UIConfigResponse = {
  userId: number;
  data: Record<string, unknown>;
  keyUpdatedAt: Record<string, string>;
  schemaVersion: number;
  updatedAt: string;
};

type UIConfigPatchRequest = {
  patches: Array<{
    keyPath: string;
    value: unknown;
    updatedAt: string; // ISO timestamp
  }>;
};

// ============================================================================
// Helper: Get user by Clerk ID
// ============================================================================

async function getUserByClerkId(clerkId: string) {
  const result = await db
    .select({ id: userSchema.id })
    .from(userSchema)
    .where(eq(userSchema.clerkId, clerkId))
    .limit(1);

  return result[0] ?? null;
}

// ============================================================================
// Helper: Set nested value in object
// ============================================================================

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) {
    return;
  }

  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[lastKey] = value;
}

// ============================================================================
// GET Handler - Fetch UI Config
// ============================================================================

export async function GET() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Get UI config from database
    const configResult = await db
      .select()
      .from(userUiConfigSchema)
      .where(eq(userUiConfigSchema.userId, user.id))
      .limit(1);

    const config = configResult[0];

    if (!config) {
      // Return empty config (client will use defaults)
      return NextResponse.json({
        userId: user.id,
        data: {},
        keyUpdatedAt: {},
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      } satisfies UIConfigResponse);
    }

    return NextResponse.json({
      userId: config.userId,
      data: config.data,
      keyUpdatedAt: config.keyUpdatedAt,
      schemaVersion: config.schemaVersion,
      updatedAt: config.updatedAt.toISOString(),
    } satisfies UIConfigResponse);
  } catch (error) {
    console.error('Error fetching UI config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UI config' },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST Handler - Update UI Config with LWW Merge
// ============================================================================

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    const body = await request.json() as UIConfigPatchRequest;

    if (!body.patches || !Array.isArray(body.patches)) {
      return NextResponse.json(
        { error: 'Invalid request: patches array required' },
        { status: 400 },
      );
    }

    // Get current config or create empty one
    const configResult = await db
      .select()
      .from(userUiConfigSchema)
      .where(eq(userUiConfigSchema.userId, user.id))
      .limit(1);

    const currentData = (configResult[0]?.data ?? {}) as Record<string, unknown>;
    const currentKeyUpdatedAt = (configResult[0]?.keyUpdatedAt ?? {}) as Record<string, string>;

    // Apply patches using LWW per key
    for (const patch of body.patches) {
      const { keyPath, value, updatedAt } = patch;

      if (!keyPath || !updatedAt) {
        continue; // Skip invalid patches
      }

      const existingTimestamp = currentKeyUpdatedAt[keyPath];

      // Only apply if incoming timestamp is newer
      if (!existingTimestamp || updatedAt > existingTimestamp) {
        setNestedValue(currentData, keyPath, value);
        currentKeyUpdatedAt[keyPath] = updatedAt;
      }
    }

    // Find the most recent timestamp
    const timestamps = Object.values(currentKeyUpdatedAt);
    const latestTimestamp = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(t => new Date(t).getTime())))
      : new Date();

    // Upsert the config
    await db
      .insert(userUiConfigSchema)
      .values({
        userId: user.id,
        data: currentData,
        keyUpdatedAt: currentKeyUpdatedAt,
        schemaVersion: 1,
        updatedAt: latestTimestamp,
      })
      .onConflictDoUpdate({
        target: userUiConfigSchema.userId,
        set: {
          data: currentData,
          keyUpdatedAt: currentKeyUpdatedAt,
          updatedAt: latestTimestamp,
        },
      });

    return NextResponse.json({
      userId: user.id,
      data: currentData,
      keyUpdatedAt: currentKeyUpdatedAt,
      schemaVersion: 1,
      updatedAt: latestTimestamp.toISOString(),
    } satisfies UIConfigResponse);
  } catch (error) {
    console.error('Error updating UI config:', error);
    return NextResponse.json(
      { error: 'Failed to update UI config' },
      { status: 500 },
    );
  }
}
