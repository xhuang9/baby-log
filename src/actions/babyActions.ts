'use server';

import type { ActiveBaby } from '@/stores/useBabyStore';
import type { StoredUser } from '@/stores/useUserStore';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessRequestsSchema,
  babyAccessSchema,
  babyInvitesSchema,
  userSchema,
} from '@/models/Schema';
import {
  assertUserCanAccessBaby,
  assertUserCanEditBaby,
  getLocalUserByClerkId,
} from '@/services/baby-access';
import {
  createEmailInviteJWT,
  generatePasskey,
  generateTokenPrefix,
  getEmailInviteExpiryDate,
  getPasskeyExpiryDate,
  hashToken,
  verifyEmailInviteJWT,
} from '@/lib/invites/invite-helpers';
import {
  AcceptInviteByCodeSchema,
  AcceptInviteByTokenSchema,
  CreateEmailInviteSchema,
  CreatePasskeyInviteSchema,
  RegenerateInviteSchema,
  RemoveCaregiverSchema,
  RevokeInviteSchema,
} from '@/validations/InviteValidation';

type ResolveAccountResult = {
  success: true;
  user: StoredUser;
  nextStep:
    | { type: 'locked' }
    | { type: 'requestAccess' }
    | { type: 'shared'; invites: Array<{ id: number; babyName: string; inviterEmail: string }> }
    | { type: 'onboarding' }
    | { type: 'select'; babies: Array<ActiveBaby> }
    | { type: 'overview'; baby: ActiveBaby };
} | {
  success: false;
  error: string;
};

export async function resolveAccountContext(): Promise<ResolveAccountResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    const firstName = clerkUser.firstName ?? null;

    // Upsert user in local database
    const userResult = await db
      .insert(userSchema)
      .values({
        clerkId: clerkUser.id,
        email,
        firstName,
      })
      .onConflictDoUpdate({
        target: userSchema.clerkId,
        set: {
          email,
          firstName,
          updatedAt: new Date(),
        },
      })
      .returning();

    const userArray = Array.isArray(userResult) ? userResult : [];
    if (userArray.length === 0) {
      return { success: false, error: 'Failed to create or update user' };
    }

    const localUser = userArray[0]!;

    const user: StoredUser = {
      id: clerkUser.id,
      localId: localUser.id,
      firstName,
      email,
      imageUrl: clerkUser.imageUrl,
    };

    // Check if user is locked
    if (localUser.locked) {
      return {
        success: true,
        user,
        nextStep: { type: 'locked' },
      };
    }

    // Get all babies the user has access to
    const babyAccess = await db
      .select({
        babyId: babiesSchema.id,
        name: babiesSchema.name,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        lastAccessedAt: babyAccessSchema.lastAccessedAt,
        archivedAt: babiesSchema.archivedAt,
      })
      .from(babyAccessSchema)
      .innerJoin(babiesSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
      .where(
        and(
          eq(babyAccessSchema.userId, localUser.id),
          sql`${babiesSchema.archivedAt} IS NULL`,
        ),
      )
      .orderBy(desc(babyAccessSchema.lastAccessedAt));

    // Check for pending invites
    const pendingInvites = await db
      .select({
        id: babyInvitesSchema.id,
        babyName: babiesSchema.name,
        inviterEmail: userSchema.email,
      })
      .from(babyInvitesSchema)
      .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
      .innerJoin(userSchema, eq(babyInvitesSchema.inviterUserId, userSchema.id))
      .where(
        and(
          eq(babyInvitesSchema.invitedEmail, email ?? ''),
          eq(babyInvitesSchema.status, 'pending'),
          sql`${babyInvitesSchema.expiresAt} > NOW()`,
        ),
      );

    // If no babies, check for access requests and invites
    if (babyAccess.length === 0) {
      // Check for outgoing pending access requests
      const outgoingRequests = await db
        .select()
        .from(babyAccessRequestsSchema)
        .where(
          and(
            eq(babyAccessRequestsSchema.requesterUserId, localUser.id),
            eq(babyAccessRequestsSchema.status, 'pending'),
          ),
        )
        .limit(1);

      if (outgoingRequests.length > 0) {
        return {
          success: true,
          user,
          nextStep: { type: 'requestAccess' },
        };
      }

      // Check for incoming pending access requests
      const incomingRequests = await db
        .select()
        .from(babyAccessRequestsSchema)
        .where(
          and(
            or(
              eq(babyAccessRequestsSchema.targetUserId, localUser.id),
              eq(babyAccessRequestsSchema.targetEmail, email?.toLowerCase() ?? ''),
            ),
            eq(babyAccessRequestsSchema.status, 'pending'),
          ),
        )
        .limit(1);

      if (incomingRequests.length > 0 || pendingInvites.length > 0) {
        return {
          success: true,
          user,
          nextStep: {
            type: 'shared',
            invites: pendingInvites.map(inv => ({
              id: inv.id,
              babyName: inv.babyName,
              inviterEmail: inv.inviterEmail ?? 'Unknown',
            })),
          },
        };
      }

      // No requests or invites, go to onboarding
      return {
        success: true,
        user,
        nextStep: { type: 'onboarding' },
      };
    }

    // Check if default baby is valid
    let defaultBaby = babyAccess.find(b => b.babyId === localUser.defaultBabyId);

    // If no valid default, pick the most recently accessed one
    if (!defaultBaby) {
      defaultBaby = babyAccess[0];

      // Update default baby in database
      if (defaultBaby) {
        await db
          .update(userSchema)
          .set({ defaultBabyId: defaultBaby.babyId })
          .where(eq(userSchema.id, localUser.id));
      }
    }

    if (!defaultBaby) {
      return {
        success: true,
        user,
        nextStep: { type: 'onboarding' },
      };
    }

    // If exactly one baby or default is set, go to overview
    if (babyAccess.length === 1 || defaultBaby) {
      const activeBaby: ActiveBaby = {
        babyId: defaultBaby.babyId,
        name: defaultBaby.name,
        accessLevel: defaultBaby.accessLevel,
        caregiverLabel: defaultBaby.caregiverLabel,
      };

      // Update lastAccessedAt
      await db
        .update(babyAccessSchema)
        .set({ lastAccessedAt: new Date() })
        .where(
          and(
            eq(babyAccessSchema.babyId, defaultBaby.babyId),
            eq(babyAccessSchema.userId, localUser.id),
          ),
        );

      return {
        success: true,
        user,
        nextStep: { type: 'overview', baby: activeBaby },
      };
    }

    // Multiple babies without a default, go to select page
    const babies: Array<ActiveBaby> = babyAccess.map(b => ({
      babyId: b.babyId,
      name: b.name,
      accessLevel: b.accessLevel,
      caregiverLabel: b.caregiverLabel,
    }));

    return {
      success: true,
      user,
      nextStep: { type: 'select', babies },
    };
  } catch (error) {
    console.error('Error resolving account context:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type CreateBabyResult
  = | { success: true; baby: ActiveBaby }
    | { success: false; error: string };

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

    revalidatePath('/overview');

    return {
      success: true,
      baby: {
        babyId: baby.id,
        name: baby.name,
        accessLevel: 'owner',
        caregiverLabel: data.caregiverLabel ?? 'Parent',
      },
    };
  } catch (error) {
    console.error('Error creating baby:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type AcceptInviteResult
  = | { success: true; baby: ActiveBaby }
    | { success: false; error: string };

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

type UpdateBabyResult
  = | { success: true }
    | { success: false; error: string };

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
      await db
        .update(babiesSchema)
        .set(updateData)
        .where(eq(babiesSchema.id, babyId));
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

type GetUserBabiesResult
  = | { success: true; babies: ActiveBaby[] }
    | { success: false; error: string };

export async function getUserBabies(): Promise<GetUserBabiesResult> {
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

    const babyAccess = await db
      .select({
        babyId: babiesSchema.id,
        name: babiesSchema.name,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
      })
      .from(babyAccessSchema)
      .innerJoin(babiesSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
      .where(
        and(
          eq(babyAccessSchema.userId, localUser.id),
          sql`${babiesSchema.archivedAt} IS NULL`,
        ),
      )
      .orderBy(desc(babyAccessSchema.lastAccessedAt));

    return {
      success: true,
      babies: babyAccess.map(b => ({
        babyId: b.babyId,
        name: b.name,
        accessLevel: b.accessLevel,
        caregiverLabel: b.caregiverLabel,
      })),
    };
  } catch (error) {
    console.error('Error getting user babies:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type SetDefaultBabyResult
  = | { success: true; baby: ActiveBaby }
    | { success: false; error: string };

export async function setDefaultBaby(babyId: number): Promise<SetDefaultBabyResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user can access this baby
    const accessResult = await assertUserCanAccessBaby(userId, babyId);
    if (!accessResult.success) {
      return accessResult;
    }

    const { user, access } = accessResult.data;

    // Update default baby
    await db
      .update(userSchema)
      .set({ defaultBabyId: babyId })
      .where(eq(userSchema.id, user.id));

    // Update lastAccessedAt
    await db
      .update(babyAccessSchema)
      .set({ lastAccessedAt: new Date() })
      .where(
        and(
          eq(babyAccessSchema.babyId, babyId),
          eq(babyAccessSchema.userId, user.id),
        ),
      );

    revalidatePath('/overview');
    revalidatePath('/account/bootstrap');
    revalidatePath(`/settings/babies/${babyId}/share`);

    return {
      success: true,
      baby: {
        babyId: access.babyId,
        name: access.babyName,
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
      },
    };
  } catch (error) {
    console.error('Error setting default baby:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


// ===== New Invite System Actions =====

type CreatePasskeyInviteResult =
  | { success: true; code: string; expiresAt: Date; inviteId: number }
  | { success: false; error: string };

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
        token: code, // kept for backwards compatibility, but will be removed later
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
  }
  catch (error) {
    console.error('Error creating passkey invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type CreateEmailInviteResult =
  | { success: true; inviteLink: string; expiresAt: Date; inviteId: number }
  | { success: false; error: string };

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

    // Insert invite first to get inviteId
    const [invite] = await db
      .insert(babyInvitesSchema)
      .values({
        babyId: validated.babyId,
        inviterUserId: localUser.id,
        invitedEmail: validated.invitedEmail,
        accessLevel: validated.accessLevel,
        status: 'pending',
        inviteType: 'email',
        token: 'placeholder', // will be updated with JWT
        expiresAt,
        maxUses: 1,
        usesCount: 0,
      })
      .returning();

    if (!invite) {
      return { success: false, error: 'Failed to create invite' };
    }

    // Generate JWT with inviteId
    const jwt = createEmailInviteJWT({
      inviteId: invite.id,
      babyId: validated.babyId,
      email: validated.invitedEmail,
    });

    // Hash JWT jti and update invite
    const tokenHash = hashToken(jwt);

    await db
      .update(babyInvitesSchema)
      .set({
        token: jwt,
        tokenHash,
      })
      .where(eq(babyInvitesSchema.id, invite.id));

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
  }
  catch (error) {
    console.error('Error creating email invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type AcceptInviteByCodeResult =
  | { success: true; baby: ActiveBaby }
  | { success: false; error: string };

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

    return {
      success: true,
      baby: {
        babyId: invite.babyId,
        name: invite.babyName,
        accessLevel: invite.accessLevel,
        caregiverLabel: null,
      },
    };
  }
  catch (error) {
    console.error('Error accepting invite by code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type AcceptInviteByTokenResult =
  | { success: true; baby: ActiveBaby }
  | { success: false; error: string };

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

    return {
      success: true,
      baby: {
        babyId: invite.babyId,
        name: invite.babyName,
        accessLevel: invite.accessLevel,
        caregiverLabel: null,
      },
    };
  }
  catch (error) {
    console.error('Error accepting invite by token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type RevokeInviteResult =
  | { success: true }
  | { success: false; error: string };

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
  }
  catch (error) {
    console.error('Error revoking invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type RegenerateInviteResult =
  | { success: true; inviteType: 'passkey'; code: string; expiresAt: Date; inviteId: number }
  | { success: true; inviteType: 'email'; inviteLink: string; expiresAt: Date; inviteId: number }
  | { success: false; error: string };

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
            token: code,
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
      }
      else if (existingInvite.inviteType === 'email') {
        // Generate new email invite
        const expiresAt = getEmailInviteExpiryDate();

        // Insert invite first to get inviteId
        const [newInvite] = await tx
          .insert(babyInvitesSchema)
          .values({
            babyId: existingInvite.babyId,
            inviterUserId: localUser.id,
            invitedEmail: existingInvite.invitedEmail,
            accessLevel: existingInvite.accessLevel,
            status: 'pending',
            inviteType: 'email',
            token: 'placeholder',
            expiresAt,
            maxUses: 1,
            usesCount: 0,
          })
          .returning();

        if (!newInvite) {
          throw new Error('Failed to create new invite');
        }

        // Generate JWT with new inviteId
        const jwt = createEmailInviteJWT({
          inviteId: newInvite.id,
          babyId: existingInvite.babyId,
          email: existingInvite.invitedEmail!,
        });

        // Hash JWT and update invite
        const tokenHash = hashToken(jwt);

        await tx
          .update(babyInvitesSchema)
          .set({
            token: jwt,
            tokenHash,
          })
          .where(eq(babyInvitesSchema.id, newInvite.id));

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
      }
      else {
        throw new Error('Invalid invite type');
      }
    });

    revalidatePath(`/settings/babies/${existingInvite.babyId}/share`);

    return result;
  }
  catch (error) {
    console.error('Error regenerating invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type RemoveCaregiverResult =
  | { success: true }
  | { success: false; error: string };

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
  }
  catch (error) {
    console.error('Error removing caregiver:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Get Caregivers for a Baby
// ============================================================================

type Caregiver = {
  userId: number;
  email: string | null;
  firstName: string | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: string | null;
  isCurrentUser: boolean;
};

type GetCaregiversResult =
  | { success: true; caregivers: Caregiver[] }
  | { success: false; error: string };

export async function getCaregivers(babyId: number): Promise<GetCaregiversResult> {
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

    // Verify user has access to this baby
    const [access] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, babyId),
          eq(babyAccessSchema.userId, localUser.id),
        ),
      )
      .limit(1);

    if (!access) {
      return { success: false, error: 'No access to this baby' };
    }

    // Get all caregivers for this baby with user details
    const caregivers = await db
      .select({
        userId: babyAccessSchema.userId,
        email: userSchema.email,
        firstName: userSchema.firstName,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        lastAccessedAt: babyAccessSchema.lastAccessedAt,
      })
      .from(babyAccessSchema)
      .innerJoin(userSchema, eq(babyAccessSchema.userId, userSchema.id))
      .where(eq(babyAccessSchema.babyId, babyId));

    return {
      success: true,
      caregivers: caregivers.map(c => ({
        userId: c.userId!,
        email: c.email,
        firstName: c.firstName,
        accessLevel: c.accessLevel,
        caregiverLabel: c.caregiverLabel,
        lastAccessedAt: c.lastAccessedAt?.toISOString() ?? null,
        isCurrentUser: c.userId === localUser.id,
      })),
    };
  }
  catch (error) {
    console.error('Error fetching caregivers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Verify Baby Access (for checking if access was revoked)
// ============================================================================

type VerifyBabyAccessResult =
  | { success: true; hasAccess: true; accessLevel: 'owner' | 'editor' | 'viewer' }
  | { success: true; hasAccess: false; reason: 'no_access' | 'baby_not_found' }
  | { success: false; error: string };

export async function verifyBabyAccess(babyId: number): Promise<VerifyBabyAccessResult> {
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

    // Check if baby exists
    const [baby] = await db
      .select()
      .from(babiesSchema)
      .where(eq(babiesSchema.id, babyId))
      .limit(1);

    if (!baby) {
      return { success: true, hasAccess: false, reason: 'baby_not_found' };
    }

    // Check if user has access
    const [access] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, babyId),
          eq(babyAccessSchema.userId, localUser.id),
        ),
      )
      .limit(1);

    if (!access) {
      return { success: true, hasAccess: false, reason: 'no_access' };
    }

    return {
      success: true,
      hasAccess: true,
      accessLevel: access.accessLevel,
    };
  }
  catch (error) {
    console.error('Error verifying baby access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
