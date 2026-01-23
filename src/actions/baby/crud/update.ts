'use server';

/**
 * Update Baby Action
 *
 * Updates baby profile and/or caregiver label.
 */

import type { UpdateBabyResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { babiesSchema, babyAccessSchema } from '@/models/Schema';
import { assertUserCanEditBaby } from '@/services/baby-access';

export async function updateBaby(
  babyId: number,
  data: {
    name?: string;
    birthDate?: Date | null;
    gender?: 'male' | 'female' | 'other' | 'unknown' | null;
    birthWeightG?: number | null;
    caregiverLabel?: string | null;
  },
): Promise<UpdateBabyResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user can edit this baby (owner or editor)
    const accessResult = await assertUserCanEditBaby(userId, babyId);
    if (!accessResult.success) {
      return accessResult;
    }

    const { user } = accessResult.data;

    // Update baby details
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate;
    }
    if (data.gender !== undefined) {
      updateData.gender = data.gender;
    }
    if (data.birthWeightG !== undefined) {
      updateData.birthWeightG = data.birthWeightG;
    }

    if (Object.keys(updateData).length > 0) {
      const [updated] = await db
        .update(babiesSchema)
        .set(updateData)
        .where(eq(babiesSchema.id, babyId))
        .returning();

      // Write sync event for other caregivers to pull
      if (updated) {
        await writeSyncEvent({
          babyId,
          entityType: 'baby',
          entityId: babyId,
          op: 'update',
          payload: {
            id: updated.id,
            name: updated.name,
            birthDate: updated.birthDate?.toISOString() ?? null,
            gender: updated.gender,
            birthWeightG: updated.birthWeightG,
            archivedAt: updated.archivedAt?.toISOString() ?? null,
            ownerUserId: updated.ownerUserId,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt?.toISOString() ?? updated.createdAt.toISOString(),
          },
        });
      }
    }

    // Update caregiver label if provided
    if (data.caregiverLabel !== undefined) {
      await db
        .update(babyAccessSchema)
        .set({ caregiverLabel: data.caregiverLabel })
        .where(
          and(
            eq(babyAccessSchema.babyId, babyId),
            eq(babyAccessSchema.userId, user.id),
          ),
        );
    }

    revalidatePath('/settings');
    revalidatePath('/overview');

    return { success: true };
  } catch (error) {
    console.error('Error updating baby:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
