'use server';

/**
 * Verify Baby Access Action
 *
 * Checks if the current user has access to a specific baby.
 */

import type { VerifyBabyAccessResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { babiesSchema, babyAccessSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

export async function verifyBabyAccess(babyId: number): Promise<VerifyBabyAccessResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const userResult = await getLocalUserByClerkId(userId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Check if baby exists
    const [baby] = await db
      .select()
      .from(babiesSchema)
      .where(eq(babiesSchema.id, babyId))
      .limit(1);

    if (!baby) {
      return { success: true, hasAccess: false, reason: 'baby_not_found' };
    }

    // Check if user has access
    const [access] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, babyId),
          eq(babyAccessSchema.userId, localUser.id),
        ),
      )
      .limit(1);

    if (!access) {
      return { success: true, hasAccess: false, reason: 'no_access' };
    }

    return {
      success: true,
      hasAccess: true,
      accessLevel: access.accessLevel,
    };
  } catch (error) {
    console.error('Error verifying baby access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
