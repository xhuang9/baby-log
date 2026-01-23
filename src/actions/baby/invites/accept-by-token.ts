'use server';

/**
 * Accept Invite By Token Action
 *
 * Accepts an email-based invite using JWT token.
 */

import type { AcceptInviteByTokenResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getLatestSyncCursor } from '@/lib/db/helpers/sync-events';
import { hashToken, verifyEmailInviteJWT } from '@/lib/invites/invite-helpers';
import { babiesSchema, babyAccessSchema, babyInvitesSchema, userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { AcceptInviteByTokenSchema } from '@/validations/InviteValidation';

export async function acceptInviteByToken(
  data: { token: string },
): Promise<AcceptInviteByTokenResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = AcceptInviteByTokenSchema.parse(data);

    // Verify JWT
    const payload = verifyEmailInviteJWT(validated.token);
    if (!payload) {
      return { success: false, error: 'Invalid or expired invite link' };
    }

    const userResult = await getLocalUserByClerkId(userId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Verify current user's email matches JWT email claim
    if (localUser.email?.toLowerCase() !== payload.email.toLowerCase()) {
      return { success: false, error: 'This invite was sent to a different email address' };
    }

    // Hash JWT jti to query invite
    const tokenHash = hashToken(payload.jti);

    // Query invite
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
          eq(babyInvitesSchema.id, payload.inviteId),
          eq(babyInvitesSchema.tokenHash, tokenHash),
          eq(babyInvitesSchema.status, 'pending'),
          eq(babyInvitesSchema.inviteType, 'email'),
        ),
      )
      .limit(1);

    if (!invite) {
      return { success: false, error: 'Invalid or expired invite link' };
    }

    if (invite.expiresAt < new Date()) {
      return { success: false, error: 'Invalid or expired invite link' };
    }

    if (invite.usesCount >= invite.maxUses) {
      return { success: false, error: 'This invite has already been used' };
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
    console.error('Error accepting invite by token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
