'use server';

/**
 * Create Baby Action
 *
 * Creates a new baby and sets owner access.
 */

import type { CreateBabyResult } from '../types';
import type { ActiveBaby } from '@/stores/useBabyStore';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { babiesSchema, babyAccessSchema, userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

export async function createBaby(data: {
  name: string;
  birthDate?: Date | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
}): Promise<CreateBabyResult> {
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

    if (localUser.locked) {
      return { success: false, error: 'Account is locked' };
    }

    // Create baby
    const babyResult = await db
      .insert(babiesSchema)
      .values({
        ownerUserId: localUser.id,
        name: data.name,
        birthDate: data.birthDate ?? null,
        gender: data.gender ?? null,
        birthWeightG: data.birthWeightG ?? null,
      })
      .returning();

    const babyArray = Array.isArray(babyResult) ? babyResult : [];
    if (babyArray.length === 0) {
      return { success: false, error: 'Failed to create baby' };
    }

    const baby = babyArray[0]!;

    // Create owner access
    await db.insert(babyAccessSchema).values({
      babyId: baby.id,
      userId: localUser.id,
      accessLevel: 'owner',
      caregiverLabel: data.caregiverLabel ?? 'Parent',
      lastAccessedAt: new Date(),
    });

    // Set as default baby
    await db
      .update(userSchema)
      .set({ defaultBabyId: baby.id })
      .where(eq(userSchema.id, localUser.id));

    // Write sync event (for future caregivers to pull)
    await writeSyncEvent({
      babyId: baby.id,
      entityType: 'baby',
      entityId: baby.id,
      op: 'create',
      payload: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate?.toISOString() ?? null,
        gender: baby.gender,
        birthWeightG: baby.birthWeightG,
        archivedAt: baby.archivedAt?.toISOString() ?? null,
        ownerUserId: baby.ownerUserId,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt?.toISOString() ?? baby.createdAt.toISOString(),
      },
    });

    revalidatePath('/overview');

    const activeBaby: ActiveBaby = {
      babyId: baby.id,
      name: baby.name,
      accessLevel: 'owner',
      caregiverLabel: data.caregiverLabel ?? 'Parent',
    };

    return {
      success: true,
      baby: activeBaby,
    };
  } catch (error) {
    console.error('Error creating baby:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
