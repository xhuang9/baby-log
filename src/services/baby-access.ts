/**
 * Baby Access Service
 *
 * Shared business logic for baby access control.
 * Used by server actions and (future) API routes.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessSchema,
  userSchema,
} from '@/models/Schema';

// Types
export type AccessLevel = 'owner' | 'editor' | 'viewer';

export type LocalUser = {
  id: number;
  clerkId: string | null;
  email: string | null;
  firstName: string | null;
  locked: boolean | null;
  defaultBabyId: number | null;
};

export type BabyAccess = {
  babyId: number;
  babyName: string;
  accessLevel: AccessLevel;
  caregiverLabel: string | null;
};

export type ServiceResult<T>
  = | { success: true; data: T }
    | { success: false; error: string };

/**
 * Get local user by Clerk ID
 */
export async function getLocalUserByClerkId(
  clerkId: string,
): Promise<ServiceResult<LocalUser>> {
  const [localUser] = await db
    .select()
    .from(userSchema)
    .where(eq(userSchema.clerkId, clerkId))
    .limit(1);

  if (!localUser) {
    return { success: false, error: 'User not found' };
  }

  return {
    success: true,
    data: {
      id: localUser.id,
      clerkId: localUser.clerkId,
      email: localUser.email,
      firstName: localUser.firstName,
      locked: localUser.locked,
      defaultBabyId: localUser.defaultBabyId,
    },
  };
}

/**
 * Get user's access to a specific baby
 */
export async function getBabyAccess(
  userId: number,
  babyId: number,
): Promise<ServiceResult<BabyAccess>> {
  const [access] = await db
    .select({
      babyId: babiesSchema.id,
      babyName: babiesSchema.name,
      accessLevel: babyAccessSchema.accessLevel,
      caregiverLabel: babyAccessSchema.caregiverLabel,
    })
    .from(babyAccessSchema)
    .innerJoin(babiesSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
    .where(
      and(
        eq(babyAccessSchema.userId, userId),
        eq(babyAccessSchema.babyId, babyId),
        sql`${babiesSchema.archivedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!access) {
    return { success: false, error: 'You do not have access to this baby' };
  }

  return {
    success: true,
    data: {
      babyId: access.babyId,
      babyName: access.babyName,
      accessLevel: access.accessLevel,
      caregiverLabel: access.caregiverLabel,
    },
  };
}

/**
 * Verify user can access a baby (any access level)
 */
export async function assertUserCanAccessBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>> {
  const userResult = await getLocalUserByClerkId(clerkId);
  if (!userResult.success) {
    return userResult;
  }

  const user = userResult.data;

  if (user.locked) {
    return { success: false, error: 'Account is locked' };
  }

  const accessResult = await getBabyAccess(user.id, babyId);
  if (!accessResult.success) {
    return accessResult;
  }

  return {
    success: true,
    data: { user, access: accessResult.data },
  };
}

/**
 * Verify user can edit a baby (owner or editor access)
 */
export async function assertUserCanEditBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>> {
  const result = await assertUserCanAccessBaby(clerkId, babyId);
  if (!result.success) {
    return result;
  }

  const { user, access } = result.data;

  if (access.accessLevel === 'viewer') {
    return { success: false, error: 'You do not have permission to edit this baby' };
  }

  return { success: true, data: { user, access } };
}

/**
 * Verify user can add logs to a baby (owner or editor access)
 */
export async function assertUserCanLogForBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>> {
  const result = await assertUserCanAccessBaby(clerkId, babyId);
  if (!result.success) {
    return result;
  }

  const { user, access } = result.data;

  if (access.accessLevel === 'viewer') {
    return { success: false, error: 'You do not have permission to add logs' };
  }

  return { success: true, data: { user, access } };
}
