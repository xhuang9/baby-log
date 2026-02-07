'use server';

/**
 * Create Email Invite Action
 *
 * Creates an email-based invite for sharing baby access.
 */

import type { CreateEmailInviteResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createEmailInviteJWT,
  generateJti,
  getEmailInviteExpiryDate,
  hashToken,
} from '@/lib/invites/invite-helpers';
import { babyAccessSchema, babyInvitesSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { CreateEmailInviteSchema } from '@/validations/InviteValidation';

export async function createEmailInvite(
  data: { babyId: number; invitedEmail: string; accessLevel?: 'owner' | 'editor' | 'viewer'; expiresInHours?: number },
): Promise<CreateEmailInviteResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = CreateEmailInviteSchema.parse(data);

    const userResult = await getLocalUserByClerkId(userId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Verify user is owner of baby
    const [access] = await db
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

    if (!access) {
      return { success: false, error: 'Only baby owners can create invites' };
    }

    const expiresAt = getEmailInviteExpiryDate();

    // Generate jti and hash it upfront so we can insert with tokenHash
    const jti = generateJti();
    const tokenHash = hashToken(jti);

    // Insert invite with tokenHash (satisfies NOT NULL constraint)
    const [invite] = await db
      .insert(babyInvitesSchema)
      .values({
        babyId: validated.babyId,
        inviterUserId: localUser.id,
        invitedEmail: validated.invitedEmail,
        accessLevel: validated.accessLevel,
        status: 'pending',
        inviteType: 'email',
        tokenHash,
        expiresAt,
        maxUses: 1,
        usesCount: 0,
      })
      .returning();

    if (!invite) {
      return { success: false, error: 'Failed to create invite' };
    }

    // Generate JWT with the same jti used for the hash
    const jwt = createEmailInviteJWT({
      inviteId: invite.id,
      babyId: validated.babyId,
      email: validated.invitedEmail,
      jti,
    });

    // Construct invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/account/bootstrap?invite=${jwt}`;

    revalidatePath(`/settings/babies/${validated.babyId}/share`);

    return {
      success: true,
      inviteLink,
      expiresAt,
      inviteId: invite.id,
    };
  } catch (error) {
    console.error('Error creating email invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
