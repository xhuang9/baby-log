import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { FeedTile } from '@/components/overview/FeedTile';
import { db } from '@/lib/db';
import { babiesSchema, babyAccessSchema, feedLogSchema, userSchema } from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';

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
    redirect(getI18nPath('/account/resolve', locale));
  }

  // Check if user has a default baby
  if (!localUser.defaultBabyId) {
    redirect(getI18nPath('/account/resolve', locale));
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
    redirect(getI18nPath('/account/resolve', locale));
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
      <div className="space-y-4">
        {/* Baby Info Card */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-bold">{babyAccess.name}</h2>
          <p className="text-sm text-muted-foreground">
            {babyAccess.caregiverLabel || 'Caregiver'}
            {' '}
            &bull;
            {' '}
            {babyAccess.accessLevel}
          </p>
        </div>

        {/* Activity Grid */}
        <div className="space-y-3">
          <FeedTile babyId={babyAccess.babyId} latestFeed={latestFeed} />

          {/* Placeholder tiles for future activities */}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-l-4 border-l-purple-500 bg-purple-500/5 p-4 text-left transition-colors hover:bg-purple-500/10"
            disabled
          >
            <div>
              <h3 className="text-lg font-semibold">Sleep</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-l-4 border-l-amber-500 bg-amber-500/5 p-4 text-left transition-colors hover:bg-amber-500/10"
            disabled
          >
            <div>
              <h3 className="text-lg font-semibold">Nappy</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-l-4 border-l-emerald-500 bg-emerald-500/5 p-4 text-left transition-colors hover:bg-emerald-500/10"
            disabled
          >
            <div>
              <h3 className="text-lg font-semibold">Solids</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-l-4 border-l-blue-500 bg-blue-500/5 p-4 text-left transition-colors hover:bg-blue-500/10"
            disabled
          >
            <div>
              <h3 className="text-lg font-semibold">Bath</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
