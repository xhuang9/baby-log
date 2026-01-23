'use server';

/**
 * Revoke Invite Action
 *
 * Revokes a pending invite.
 */

import type { RevokeInviteResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { babyAccessSchema, babyInvitesSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { RevokeInviteSchema } from '@/validations/InviteValidation';

export async function revokeInvite(
  data: { inviteId: number },
): Promise<RevokeInviteResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = RevokeInviteSchema.parse(data);

    const userResult = await getLocalUserByClerkId(userId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Get invite and verify ownership
    const [invite] = await db
      .select({
        id: babyInvitesSchema.id,
        babyId: babyInvitesSchema.babyId,
      })
      .from(babyInvitesSchema)
      .where(eq(babyInvitesSchema.id, validated.inviteId))
      .limit(1);

    if (!invite) {
      return { success: false, error: 'Invite not found' };
    }

    // Verify user is owner of baby
    const [access] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, invite.babyId),
          eq(babyAccessSchema.userId, localUser.id),
          eq(babyAccessSchema.accessLevel, 'owner'),
        ),
      )
      .limit(1);

    if (!access) {
      return { success: false, error: 'Only baby owners can revoke invites' };
    }

    // Revoke invite
    await db
      .update(babyInvitesSchema)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
      })
      .where(eq(babyInvitesSchema.id, validated.inviteId));

    revalidatePath(`/settings/babies/${invite.babyId}/share`);

    return { success: true };
  } catch (error) {
    console.error('Error revoking invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
