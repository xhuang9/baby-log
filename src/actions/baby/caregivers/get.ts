'use server';

/**
 * Get Caregivers Action
 *
 * Returns all caregivers for a baby.
 */

import type { GetCaregiversResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { babyAccessSchema, userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

export async function getCaregivers(babyId: number): Promise<GetCaregiversResult> {
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

    // Verify user has access to this baby
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
      return { success: false, error: 'No access to this baby' };
    }

    // Get all caregivers for this baby with user details
    const caregivers = await db
      .select({
        userId: babyAccessSchema.userId,
        email: userSchema.email,
        firstName: userSchema.firstName,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        lastAccessedAt: babyAccessSchema.lastAccessedAt,
      })
      .from(babyAccessSchema)
      .innerJoin(userSchema, eq(babyAccessSchema.userId, userSchema.id))
      .where(eq(babyAccessSchema.babyId, babyId));

    return {
      success: true,
      caregivers: caregivers.map(c => ({
        userId: c.userId!,
        email: c.email,
        firstName: c.firstName,
        accessLevel: c.accessLevel,
        caregiverLabel: c.caregiverLabel,
        lastAccessedAt: c.lastAccessedAt?.toISOString() ?? null,
        isCurrentUser: c.userId === localUser.id,
      })),
    };
  } catch (error) {
    console.error('Error fetching caregivers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
