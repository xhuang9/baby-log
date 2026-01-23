'use server';

/**
 * Accept Invite By Code Action
 *
 * Accepts a passkey invite and grants baby access.
 */

import type { AcceptInviteByCodeResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getLatestSyncCursor } from '@/lib/db/helpers/sync-events';
import { hashToken } from '@/lib/invites/invite-helpers';
import { babiesSchema, babyAccessSchema, babyInvitesSchema, userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { AcceptInviteByCodeSchema } from '@/validations/InviteValidation';

export async function acceptInviteByCode(
  data: { code: string },
): Promise<AcceptInviteByCodeResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = AcceptInviteByCodeSchema.parse(data);

    const userResult = await getLocalUserByClerkId(userId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Hash the code to query invite
    const tokenHash = hashToken(validated.code);

    // Query invite by tokenHash
    const [invite] = await db
      .select({
        id: babyInvitesSchema.id,
        babyId: babyInvitesSchema.babyId,
        accessLevel: babyInvitesSchema.accessLevel,
        status: babyInvitesSchema.status,
        expiresAt: babyInvitesSchema.expiresAt,
        usesCount: babyInvitesSchema.usesCount,
        maxUses: babyInvitesSchema.maxUses,
        babyName: babiesSchema.name,
      })
      .from(babyInvitesSchema)
      .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
      .where(
        and(
          eq(babyInvitesSchema.tokenHash, tokenHash),
          eq(babyInvitesSchema.status, 'pending'),
          eq(babyInvitesSchema.inviteType, 'passkey'),
        ),
      )
      .limit(1);

    // Generic error message to prevent information disclosure
    if (!invite) {
      return { success: false, error: 'Invalid or expired code' };
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: 'Invalid or expired code' };
    }

    if (invite.usesCount >= invite.maxUses) {
      return { success: false, error: 'Invalid or expired code' };
    }

    // Check if user already has access
    const [existingAccess] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, invite.babyId),
          eq(babyAccessSchema.userId, localUser.id),
        ),
      )
      .limit(1);

    if (existingAccess) {
      return { success: false, error: 'You already have access to this baby' };
    }

    // Use transaction for atomic operation
    await db.transaction(async (tx) => {
      // Create baby access
      await tx.insert(babyAccessSchema).values({
        babyId: invite.babyId,
        userId: localUser.id,
        accessLevel: invite.accessLevel,
        lastAccessedAt: new Date(),
      });

      // Update invite
      await tx
        .update(babyInvitesSchema)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          invitedUserId: localUser.id,
          usesCount: invite.usesCount + 1,
        })
        .where(eq(babyInvitesSchema.id, invite.id));

      // Set as default baby if user has none
      if (!localUser.defaultBabyId) {
        await tx
          .update(userSchema)
          .set({ defaultBabyId: invite.babyId })
          .where(eq(userSchema.id, localUser.id));
      }
    });

    revalidatePath('/overview');
    revalidatePath('/account/bootstrap');
    revalidatePath(`/settings/babies/${invite.babyId}/share`);

    // Get initial sync cursor for the new caregiver
    const initialSyncCursor = await getLatestSyncCursor(invite.babyId);

    return {
      success: true,
      baby: {
        babyId: invite.babyId,
        name: invite.babyName,
        accessLevel: invite.accessLevel,
        caregiverLabel: null,
      },
      initialSyncCursor,
    };
  } catch (error) {
    console.error('Error accepting invite by code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
