'use server';

/**
 * Set Default Baby Action
 *
 * Sets the default baby for the current user.
 */

import type { SetDefaultBabyResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { babyAccessSchema, userSchema } from '@/models/Schema';
import { assertUserCanAccessBaby } from '@/services/baby-access';

export async function setDefaultBaby(babyId: number): Promise<SetDefaultBabyResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user can access this baby
    const accessResult = await assertUserCanAccessBaby(userId, babyId);
    if (!accessResult.success) {
      return accessResult;
    }

    const { user, access } = accessResult.data;

    // Update default baby
    await db
      .update(userSchema)
      .set({ defaultBabyId: babyId })
      .where(eq(userSchema.id, user.id));

    // Update lastAccessedAt
    await db
      .update(babyAccessSchema)
      .set({ lastAccessedAt: new Date() })
      .where(
        and(
          eq(babyAccessSchema.babyId, babyId),
          eq(babyAccessSchema.userId, user.id),
        ),
      );

    revalidatePath('/overview');
    revalidatePath('/account/bootstrap');
    revalidatePath(`/settings/babies/${babyId}/share`);

    return {
      success: true,
      baby: {
        babyId: access.babyId,
        name: access.babyName,
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
      },
    };
  } catch (error) {
    console.error('Error setting default baby:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
