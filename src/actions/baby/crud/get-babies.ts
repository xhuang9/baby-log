'use server';

/**
 * Get User Babies Action
 *
 * Returns all babies the current user has access to.
 */

import type { GetUserBabiesResult } from '../types';
import type { ActiveBaby } from '@/stores/useBabyStore';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { babiesSchema, babyAccessSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

export async function getUserBabies(): Promise<GetUserBabiesResult> {
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

    const babyAccess = await db
      .select({
        babyId: babiesSchema.id,
        name: babiesSchema.name,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
      })
      .from(babyAccessSchema)
      .innerJoin(babiesSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
      .where(
        and(
          eq(babyAccessSchema.userId, localUser.id),
          sql`${babiesSchema.archivedAt} IS NULL`,
        ),
      )
      .orderBy(desc(babyAccessSchema.lastAccessedAt));

    const babies: ActiveBaby[] = babyAccess.map(b => ({
      babyId: b.babyId,
      name: b.name,
      accessLevel: b.accessLevel,
      caregiverLabel: b.caregiverLabel,
    }));

    return {
      success: true,
      babies,
    };
  } catch (error) {
    console.error('Error getting user babies:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
