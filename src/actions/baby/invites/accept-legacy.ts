'use server';

/**
 * Accept Invite (Legacy) Action
 *
 * Legacy invite acceptance - for backwards compatibility.
 */

import type { AcceptInviteResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { babiesSchema, babyAccessSchema, babyInvitesSchema, userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

export async function acceptInvite(inviteId: number): Promise<AcceptInviteResult> {
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

    // Get invite
    const [invite] = await db
      .select({
        id: babyInvitesSchema.id,
        babyId: babyInvitesSchema.babyId,
        accessLevel: babyInvitesSchema.accessLevel,
        status: babyInvitesSchema.status,
        expiresAt: babyInvitesSchema.expiresAt,
        babyName: babiesSchema.name,
      })
      .from(babyInvitesSchema)
      .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
      .where(eq(babyInvitesSchema.id, inviteId))
      .limit(1);

    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Invite is not pending' };
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: 'Invite has expired' };
    }

    // Check if user already has access
    const existingAccess = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, invite.babyId),
          eq(babyAccessSchema.userId, localUser.id),
        ),
      )
      .limit(1);

    if (existingAccess.length > 0) {
      return { success: false, error: 'You already have access to this baby' };
    }

    // Create baby access
    const accessResult = await db
      .insert(babyAccessSchema)
      .values({
        babyId: invite.babyId,
        userId: localUser.id,
        accessLevel: invite.accessLevel,
        lastAccessedAt: new Date(),
      })
      .returning();

    const access = accessResult[0];
    if (!access) {
      return { success: false, error: 'Failed to create baby access' };
    }

    // Update invite status
    await db
      .update(babyInvitesSchema)
      .set({
        status: 'accepted',
        invitedUserId: localUser.id,
      })
      .where(eq(babyInvitesSchema.id, inviteId));

    // Set as default baby if user has no default
    if (!localUser.defaultBabyId) {
      await db
        .update(userSchema)
        .set({ defaultBabyId: invite.babyId })
        .where(eq(userSchema.id, localUser.id));
    }

    revalidatePath('/overview');

    return {
      success: true,
      baby: {
        babyId: invite.babyId,
        name: invite.babyName,
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
      },
    };
  } catch (error) {
    console.error('Error accepting invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
