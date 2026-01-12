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
