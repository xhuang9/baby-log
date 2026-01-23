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
import { NextResponse } from 'next/server';
import { validatePushRequest } from './validation';
import { handlePushRequest } from './handler';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth check
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Validate request
  const validation = await validatePushRequest(request);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status },
    );
  }

  // Handle empty array early
  if (validation.data.mutations.length === 0) {
    return NextResponse.json({
      results: [],
      newCursor: null,
    });
  }

  // Process mutations
  try {
    const response = await handlePushRequest(
      clerkId,
      validation.data.mutations
    );
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    console.error('Mutation push error:', error);
    return NextResponse.json(
      { error: 'Failed to process mutations' },
      { status: 500 },
    );
  }
}
