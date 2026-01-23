'use server';

/**
 * Remove Caregiver Action
 *
 * Removes a caregiver's access to a baby.
 */

import type { RemoveCaregiverResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { babyAccessSchema, userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { RemoveCaregiverSchema } from '@/validations/InviteValidation';

export async function removeCaregiver(
  data: { babyId: number; userId: number },
): Promise<RemoveCaregiverResult> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = RemoveCaregiverSchema.parse(data);

    const userResult = await getLocalUserByClerkId(clerkUserId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Verify caller is owner
    const [callerAccess] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, validated.babyId),
          eq(babyAccessSchema.userId, localUser.id),
          eq(babyAccessSchema.accessLevel, 'owner'),
        ),
      )
      .limit(1);

    if (!callerAccess) {
      return { success: false, error: 'Only baby owners can remove caregivers' };
    }

    // Verify not removing self
    if (validated.userId === localUser.id) {
      return { success: false, error: 'Cannot remove yourself' };
    }

    // Get target user's access
    const [targetAccess] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, validated.babyId),
          eq(babyAccessSchema.userId, validated.userId),
        ),
      )
      .limit(1);

    if (!targetAccess) {
      return { success: false, error: 'User does not have access to this baby' };
    }

    // Verify not removing another owner
    if (targetAccess.accessLevel === 'owner') {
      return { success: false, error: 'Cannot remove another owner' };
    }

    // Remove access
    await db
      .delete(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, validated.babyId),
          eq(babyAccessSchema.userId, validated.userId),
        ),
      );

    // Clear user's defaultBabyId if it matches
    await db
      .update(userSchema)
      .set({ defaultBabyId: null })
      .where(
        and(
          eq(userSchema.id, validated.userId),
          eq(userSchema.defaultBabyId, validated.babyId),
        ),
      );

    revalidatePath(`/settings/babies/${validated.babyId}/share`);
    revalidatePath('/overview');

    return { success: true };
  } catch (error) {
    console.error('Error removing caregiver:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
