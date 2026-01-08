import { auth } from '@clerk/nextjs/server';
import { and, eq, or, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessRequestsSchema,
  babyInvitesSchema,
  userSchema,
} from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { SharedBabyInvites } from './SharedBabyInvites';

export const dynamic = 'force-dynamic';

export default async function SharedBabyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { userId } = await auth();

  if (!userId) {
    redirect(getI18nPath('/sign-in', locale));
  }

  // Get local user
  const [localUser] = await db
    .select()
    .from(userSchema)
    .where(eq(userSchema.clerkId, userId))
    .limit(1);

  if (!localUser || !localUser.email) {
    redirect(getI18nPath('/account/resolve', locale));
  }

  // Get pending invites for this user's email
  const invites = await db
    .select({
      id: babyInvitesSchema.id,
      babyName: babiesSchema.name,
      inviterFirstName: userSchema.firstName,
      inviterEmail: userSchema.email,
      accessLevel: babyInvitesSchema.accessLevel,
      expiresAt: babyInvitesSchema.expiresAt,
    })
    .from(babyInvitesSchema)
    .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
    .innerJoin(userSchema, eq(babyInvitesSchema.inviterUserId, userSchema.id))
    .where(
      and(
        eq(babyInvitesSchema.invitedEmail, localUser.email),
        eq(babyInvitesSchema.status, 'pending'),
        sql`${babyInvitesSchema.expiresAt} > NOW()`,
      ),
    );

  // Get pending incoming access requests
  const accessRequests = await db
    .select({
      id: babyAccessRequestsSchema.id,
      requesterName: userSchema.firstName,
      requesterEmail: userSchema.email,
      message: babyAccessRequestsSchema.message,
      requestedAccessLevel: babyAccessRequestsSchema.requestedAccessLevel,
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
    );

  // If no invites or access requests, redirect to resolve
  if (invites.length === 0 && accessRequests.length === 0) {
    redirect(getI18nPath('/account/resolve', locale));
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            {accessRequests.length > 0 ? 'Access Requests & Invites' : 'Shared Baby Invites'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {accessRequests.length > 0
              ? 'Review pending access requests and shared baby invites'
              : 'You have been invited to track babies shared by other caregivers'}
          </p>
        </div>

        <SharedBabyInvites
          invites={invites}
          accessRequests={accessRequests}
          redirectPath={getI18nPath('/overview', locale)}
        />
      </div>
    </div>
  );
}
