'use server';

import type {
  ApproveAccessRequestInput,
  CancelAccessRequestInput,
  CreateAccessRequestInput,
  RejectAccessRequestInput,
} from '@/validations/AccessRequestValidation';
import { auth } from '@clerk/nextjs/server';
import { and, eq, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessRequestsSchema,
  babyAccessSchema,
  userSchema,
} from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

// Types
export type AccessRequest = {
  id: number;
  requesterName: string | null;
  requesterEmail: string | null;
  targetEmail: string;
  message: string | null;
  requestedAccessLevel: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  createdAt: Date;
};

type CreateAccessRequestResult
  = | { success: true; message: string }
    | { success: false; error: string };

type ListRequestsResult
  = | { success: true; requests: AccessRequest[] }
    | { success: false; error: string };

type CancelRequestResult
  = | { success: true }
    | { success: false; error: string };

type ApproveRequestResult
  = | { success: true; message: string }
    | { success: false; error: string };

type RejectRequestResult
  = | { success: true }
    | { success: false; error: string };

// Create access request
export async function createAccessRequest(
  data: CreateAccessRequestInput,
): Promise<CreateAccessRequestResult> {
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

    const targetEmail = data.targetEmail.toLowerCase();

    // Prevent self-request
    if (targetEmail === localUser.email?.toLowerCase()) {
      return { success: false, error: 'You cannot request access from yourself' };
    }

    // Check for existing pending request
    const existingRequest = await db
      .select()
      .from(babyAccessRequestsSchema)
      .where(
        and(
          eq(babyAccessRequestsSchema.requesterUserId, localUser.id),
          eq(babyAccessRequestsSchema.targetEmail, targetEmail),
          eq(babyAccessRequestsSchema.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingRequest.length > 0) {
      return {
        success: false,
        error: 'You already have a pending request to this email',
      };
    }

    // Look up target user by email
    const [targetUser] = await db
      .select({ id: userSchema.id })
      .from(userSchema)
      .where(eq(userSchema.email, targetEmail))
      .limit(1);

    // Create request
    await db.insert(babyAccessRequestsSchema).values({
      requesterUserId: localUser.id,
      targetEmail,
      targetUserId: targetUser?.id ?? null,
      requestedAccessLevel: data.requestedAccessLevel,
      message: data.message ?? null,
      status: 'pending',
    });

    revalidatePath('/account/bootstrap');

    return { success: true, message: 'Access request sent successfully' };
  } catch (error) {
    console.error('Error creating access request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// List outgoing requests (requester's view)
export async function listOutgoingRequests(): Promise<ListRequestsResult> {
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

    const requests = await db
      .select({
        id: babyAccessRequestsSchema.id,
        requesterName: sql<string | null>`NULL`,
        requesterEmail: sql<string | null>`NULL`,
        targetEmail: babyAccessRequestsSchema.targetEmail,
        message: babyAccessRequestsSchema.message,
        requestedAccessLevel: babyAccessRequestsSchema.requestedAccessLevel,
        status: babyAccessRequestsSchema.status,
        createdAt: babyAccessRequestsSchema.createdAt,
      })
      .from(babyAccessRequestsSchema)
      .where(eq(babyAccessRequestsSchema.requesterUserId, localUser.id))
      .orderBy(sql`${babyAccessRequestsSchema.createdAt} DESC`);

    return {
      success: true,
      requests: requests.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })),
    };
  } catch (error) {
    console.error('Error listing outgoing requests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// List incoming requests (recipient's view)
export async function listIncomingRequests(): Promise<ListRequestsResult> {
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

    if (!localUser.email) {
      return { success: false, error: 'User email not found' };
    }

    // Get requests by userId or email
    const requests = await db
      .select({
        id: babyAccessRequestsSchema.id,
        requesterName: userSchema.firstName,
        requesterEmail: userSchema.email,
        targetEmail: babyAccessRequestsSchema.targetEmail,
        message: babyAccessRequestsSchema.message,
        requestedAccessLevel: babyAccessRequestsSchema.requestedAccessLevel,
        status: babyAccessRequestsSchema.status,
        createdAt: babyAccessRequestsSchema.createdAt,
      })
      .from(babyAccessRequestsSchema)
      .leftJoin(
        userSchema,
        eq(babyAccessRequestsSchema.requesterUserId, userSchema.id),
      )
      .where(
        and(
          or(
            eq(babyAccessRequestsSchema.targetUserId, localUser.id),
            eq(babyAccessRequestsSchema.targetEmail, localUser.email.toLowerCase()),
          ),
          eq(babyAccessRequestsSchema.status, 'pending'),
        ),
      )
      .orderBy(sql`${babyAccessRequestsSchema.createdAt} DESC`);

    return {
      success: true,
      requests: requests.map(r => ({
        ...r,
        createdAt: new Date(r.createdAt),
      })),
    };
  } catch (error) {
    console.error('Error listing incoming requests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Cancel access request (requester only)
export async function cancelAccessRequest(
  data: CancelAccessRequestInput,
): Promise<CancelRequestResult> {
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

    // Find request
    const [request] = await db
      .select()
      .from(babyAccessRequestsSchema)
      .where(
        and(
          eq(babyAccessRequestsSchema.id, data.requestId),
          eq(babyAccessRequestsSchema.requesterUserId, localUser.id),
        ),
      )
      .limit(1);

    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Can only cancel pending requests' };
    }

    // Update status
    await db
      .update(babyAccessRequestsSchema)
      .set({
        status: 'canceled',
        resolvedAt: new Date(),
      })
      .where(eq(babyAccessRequestsSchema.id, data.requestId));

    revalidatePath('/account/bootstrap');

    return { success: true };
  } catch (error) {
    console.error('Error canceling access request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Approve access request (recipient only)
export async function approveAccessRequest(
  data: ApproveAccessRequestInput,
): Promise<ApproveRequestResult> {
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

    if (!localUser.email) {
      return { success: false, error: 'User email not found' };
    }

    // Find request
    const [request] = await db
      .select()
      .from(babyAccessRequestsSchema)
      .where(
        and(
          eq(babyAccessRequestsSchema.id, data.requestId),
          or(
            eq(babyAccessRequestsSchema.targetUserId, localUser.id),
            eq(babyAccessRequestsSchema.targetEmail, localUser.email.toLowerCase()),
          ),
        ),
      )
      .limit(1);

    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Request is not pending' };
    }

    // Verify user has owner access to selected baby
    const [babyAccess] = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, data.babyId),
          eq(babyAccessSchema.userId, localUser.id),
          eq(babyAccessSchema.accessLevel, 'owner'),
        ),
      )
      .limit(1);

    if (!babyAccess) {
      return {
        success: false,
        error: 'You must be the owner of this baby to grant access',
      };
    }

    // Check if requester already has access
    const existingAccess = await db
      .select()
      .from(babyAccessSchema)
      .where(
        and(
          eq(babyAccessSchema.babyId, data.babyId),
          eq(babyAccessSchema.userId, request.requesterUserId),
        ),
      )
      .limit(1);

    if (existingAccess.length > 0) {
      return { success: false, error: 'User already has access to this baby' };
    }

    // Get baby name for confirmation message
    const [baby] = await db
      .select({ name: babiesSchema.name })
      .from(babiesSchema)
      .where(eq(babiesSchema.id, data.babyId))
      .limit(1);

    // Create baby access
    await db.insert(babyAccessSchema).values({
      babyId: data.babyId,
      userId: request.requesterUserId,
      accessLevel: data.accessLevel,
      lastAccessedAt: new Date(),
    });

    // Update request status
    await db
      .update(babyAccessRequestsSchema)
      .set({
        status: 'approved',
        resolvedBabyId: data.babyId,
        resolvedByUserId: localUser.id,
        resolvedAt: new Date(),
      })
      .where(eq(babyAccessRequestsSchema.id, data.requestId));

    // Set default baby for requester if they don't have one
    const [requester] = await db
      .select({ defaultBabyId: userSchema.defaultBabyId })
      .from(userSchema)
      .where(eq(userSchema.id, request.requesterUserId))
      .limit(1);

    if (requester && !requester.defaultBabyId) {
      await db
        .update(userSchema)
        .set({ defaultBabyId: data.babyId })
        .where(eq(userSchema.id, request.requesterUserId));
    }

    revalidatePath('/account/bootstrap');
    revalidatePath('/settings/babies/share');

    return {
      success: true,
      message: `Access granted to ${baby?.name ?? 'baby'} successfully`,
    };
  } catch (error) {
    console.error('Error approving access request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Reject access request (recipient only)
export async function rejectAccessRequest(
  data: RejectAccessRequestInput,
): Promise<RejectRequestResult> {
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

    if (!localUser.email) {
      return { success: false, error: 'User email not found' };
    }

    // Find request
    const [request] = await db
      .select()
      .from(babyAccessRequestsSchema)
      .where(
        and(
          eq(babyAccessRequestsSchema.id, data.requestId),
          or(
            eq(babyAccessRequestsSchema.targetUserId, localUser.id),
            eq(babyAccessRequestsSchema.targetEmail, localUser.email.toLowerCase()),
          ),
        ),
      )
      .limit(1);

    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Request is not pending' };
    }

    // Update status
    await db
      .update(babyAccessRequestsSchema)
      .set({
        status: 'rejected',
        resolvedByUserId: localUser.id,
        resolvedAt: new Date(),
      })
      .where(eq(babyAccessRequestsSchema.id, data.requestId));

    revalidatePath('/account/bootstrap');
    revalidatePath('/settings/babies/share');

    return { success: true };
  } catch (error) {
    console.error('Error rejecting access request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
