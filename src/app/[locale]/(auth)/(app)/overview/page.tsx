import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { db } from '@/lib/db';
import { babiesSchema, babyAccessSchema, feedLogSchema, userSchema } from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { ActivityTile } from './_components/ActivityTile';
import { FeedTile } from './_components/FeedTile';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Overview',
  };
}

export const dynamic = 'force-dynamic';

export default async function OverviewPage(props: {
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

  if (!localUser) {
    redirect(getI18nPath('/account/bootstrap', locale));
  }

  // Check if user has a default baby
  if (!localUser.defaultBabyId) {
    redirect(getI18nPath('/account/bootstrap', locale));
  }

  // Get the default baby details
  const [babyAccess] = await db
    .select({
      babyId: babiesSchema.id,
      name: babiesSchema.name,
      birthDate: babiesSchema.birthDate,
      gender: babiesSchema.gender,
      accessLevel: babyAccessSchema.accessLevel,
      caregiverLabel: babyAccessSchema.caregiverLabel,
    })
    .from(babiesSchema)
    .innerJoin(babyAccessSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
    .where(eq(babiesSchema.id, localUser.defaultBabyId))
    .limit(1);

  // If baby not found or no access, redirect to resolve
  if (!babyAccess) {
    redirect(getI18nPath('/account/bootstrap', locale));
  }

  // Fetch latest feed log
  const [latestFeedLog] = await db
    .select({
      id: feedLogSchema.id,
      babyId: feedLogSchema.babyId,
      method: feedLogSchema.method,
      startedAt: feedLogSchema.startedAt,
      endedAt: feedLogSchema.endedAt,
      durationMinutes: feedLogSchema.durationMinutes,
      amountMl: feedLogSchema.amountMl,
      isEstimated: feedLogSchema.isEstimated,
      endSide: feedLogSchema.endSide,
      caregiverLabel: babyAccessSchema.caregiverLabel,
      createdAt: feedLogSchema.createdAt,
    })
    .from(feedLogSchema)
    .innerJoin(
      babyAccessSchema,
      eq(babyAccessSchema.userId, feedLogSchema.loggedByUserId),
    )
    .where(eq(feedLogSchema.babyId, babyAccess.babyId))
    .orderBy(desc(feedLogSchema.startedAt))
    .limit(1);

  // Transform the feed log to match the expected type
  const latestFeed = latestFeedLog
    ? {
        id: latestFeedLog.id,
        babyId: latestFeedLog.babyId,
        method: latestFeedLog.method as 'breast' | 'bottle',
        startedAt: latestFeedLog.startedAt,
        endedAt: latestFeedLog.endedAt,
        durationMinutes: latestFeedLog.durationMinutes,
        amountMl: latestFeedLog.amountMl,
        isEstimated: latestFeedLog.isEstimated,
        endSide: latestFeedLog.endSide as 'left' | 'right' | null,
        caregiverLabel: latestFeedLog.caregiverLabel,
        createdAt: latestFeedLog.createdAt,
      }
    : null;

  return (
    <>
      <PageTitleSetter title="Overview" />
      {/* Activity Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FeedTile babyId={babyAccess.babyId} latestFeed={latestFeed} />

        {/* Placeholder tiles for future activities */}
        <ActivityTile
          title="Sleep"
          subtitle="Coming soon"
          activity="sleep"
          disabled
        />
        <ActivityTile
          title="Nappy"
          subtitle="Coming soon"
          activity="nappy"
          disabled
        />
        <ActivityTile
          title="Solids"
          subtitle="Coming soon"
          activity="solids"
          disabled
        />
        <ActivityTile
          title="Bath"
          subtitle="Coming soon"
          activity="bath"
          disabled
        />
      </div>
    </>
  );
}
