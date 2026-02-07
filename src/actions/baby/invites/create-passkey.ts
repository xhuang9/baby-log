'use server';

/**
 * Create Passkey Invite Action
 *
 * Creates a passkey-based invite for sharing baby access.
 */

import type { CreatePasskeyInviteResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  generatePasskey,
  generateTokenPrefix,
  getPasskeyExpiryDate,
  hashToken,
} from '@/lib/invites/invite-helpers';
import { babyAccessSchema, babyInvitesSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { CreatePasskeyInviteSchema } from '@/validations/InviteValidation';

export async function createPasskeyInvite(
  data: { babyId: number; accessLevel?: 'owner' | 'editor' | 'viewer'; expiresInHours?: number },
): Promise<CreatePasskeyInviteResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = CreatePasskeyInviteSchema.parse(data);

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

    // Generate passkey and hash it
    const code = generatePasskey();
    const tokenHash = hashToken(code);
    const tokenPrefix = generateTokenPrefix(code);
    const expiresAt = getPasskeyExpiryDate(validated.expiresInHours);

    // Insert invite
    const [invite] = await db
      .insert(babyInvitesSchema)
      .values({
        babyId: validated.babyId,
        inviterUserId: localUser.id,
        invitedEmail: null, // passkey invites don't have email
        accessLevel: validated.accessLevel,
        status: 'pending',
        inviteType: 'passkey',
        tokenHash,
        tokenPrefix,
        expiresAt,
        maxUses: 1,
        usesCount: 0,
      })
      .returning();

    if (!invite) {
      return { success: false, error: 'Failed to create invite' };
    }

    revalidatePath(`/settings/babies/${validated.babyId}/share`);

    // Return raw code ONCE - never stored plain-text after this
    return {
      success: true,
      code,
      expiresAt,
      inviteId: invite.id,
    };
  } catch (error) {
    console.error('Error creating passkey invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
