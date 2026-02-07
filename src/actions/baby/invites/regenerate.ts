'use server';

/**
 * Regenerate Invite Action
 *
 * Revokes existing invite and creates a new one.
 */

import type { RegenerateInviteResult } from '../types';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createEmailInviteJWT,
  generateJti,
  generatePasskey,
  generateTokenPrefix,
  getEmailInviteExpiryDate,
  getPasskeyExpiryDate,
  hashToken,
} from '@/lib/invites/invite-helpers';
import { babyAccessSchema, babyInvitesSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';
import { RegenerateInviteSchema } from '@/validations/InviteValidation';

export async function regenerateInvite(
  data: { inviteId: number },
): Promise<RegenerateInviteResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate input
    const validated = RegenerateInviteSchema.parse(data);

    const userResult = await getLocalUserByClerkId(userId);
    if (!userResult.success) {
      return userResult;
    }

    const localUser = userResult.data;

    // Get existing invite with all necessary fields
    const [existingInvite] = await db
      .select({
        id: babyInvitesSchema.id,
        babyId: babyInvitesSchema.babyId,
        accessLevel: babyInvitesSchema.accessLevel,
        inviteType: babyInvitesSchema.inviteType,
        invitedEmail: babyInvitesSchema.invitedEmail,
        status: babyInvitesSchema.status,
      })
      .from(babyInvitesSchema)
      .where(eq(babyInvitesSchema.id, validated.inviteId))
      .limit(1);

    if (!existingInvite) {
      return { success: false, error: 'Invite not found' };
    }

    // Verify user is owner of baby
    const [access] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, existingInvite.babyId),
          eq(babyAccessSchema.userId, localUser.id),
          eq(babyAccessSchema.accessLevel, 'owner'),
        ),
      )
      .limit(1);

    if (!access) {
      return { success: false, error: 'Only baby owners can regenerate invites' };
    }

    // Check if invite is pending
    if (existingInvite.status !== 'pending') {
      return { success: false, error: 'Can only regenerate pending invites' };
    }

    // Use transaction to atomically revoke old and create new invite
    const result = await db.transaction(async (tx) => {
      // Revoke old invite
      await tx
        .update(babyInvitesSchema)
        .set({
          status: 'revoked',
          revokedAt: new Date(),
        })
        .where(eq(babyInvitesSchema.id, validated.inviteId));

      // Create new invite based on type
      if (existingInvite.inviteType === 'passkey') {
        // Generate new passkey
        const code = generatePasskey();
        const tokenHash = hashToken(code);
        const tokenPrefix = generateTokenPrefix(code);
        const expiresAt = getPasskeyExpiryDate(1); // default 1 hour

        const [newInvite] = await tx
          .insert(babyInvitesSchema)
          .values({
            babyId: existingInvite.babyId,
            inviterUserId: localUser.id,
            invitedEmail: null,
            accessLevel: existingInvite.accessLevel,
            status: 'pending',
            inviteType: 'passkey',
            tokenHash,
            tokenPrefix,
            expiresAt,
            maxUses: 1,
            usesCount: 0,
          })
          .returning();

        if (!newInvite) {
          throw new Error('Failed to create new invite');
        }

        return {
          success: true as const,
          inviteType: 'passkey' as const,
          code,
          expiresAt,
          inviteId: newInvite.id,
        };
      } else if (existingInvite.inviteType === 'email') {
        // Generate new email invite
        const expiresAt = getEmailInviteExpiryDate();

        // Generate jti and hash upfront so we can insert with tokenHash
        const jti = generateJti();
        const tokenHash = hashToken(jti);

        // Insert invite with tokenHash (satisfies NOT NULL constraint)
        const [newInvite] = await tx
          .insert(babyInvitesSchema)
          .values({
            babyId: existingInvite.babyId,
            inviterUserId: localUser.id,
            invitedEmail: existingInvite.invitedEmail,
            accessLevel: existingInvite.accessLevel,
            status: 'pending',
            inviteType: 'email',
            tokenHash,
            expiresAt,
            maxUses: 1,
            usesCount: 0,
          })
          .returning();

        if (!newInvite) {
          throw new Error('Failed to create new invite');
        }

        // Generate JWT with the same jti used for the hash
        const jwt = createEmailInviteJWT({
          inviteId: newInvite.id,
          babyId: existingInvite.babyId,
          email: existingInvite.invitedEmail!,
          jti,
        });

        // Construct invite link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteLink = `${baseUrl}/account/bootstrap?invite=${jwt}`;

        return {
          success: true as const,
          inviteType: 'email' as const,
          inviteLink,
          expiresAt,
          inviteId: newInvite.id,
        };
      } else {
        throw new Error('Invalid invite type');
      }
    });

    revalidatePath(`/settings/babies/${existingInvite.babyId}/share`);

    return result;
  } catch (error) {
    console.error('Error regenerating invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
