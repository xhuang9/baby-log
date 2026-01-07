import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { db } from '@/libs/DB';
import { babiesSchema, babyAccessSchema, userSchema } from '@/models/Schema';
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

  // TODO: Fetch feed logs and other baby-specific data scoped to babyAccess.babyId
  // Example: const feedLogs = await db.select().from(feedLogSchema).where(eq(feedLogSchema.babyId, babyAccess.babyId))

  return (
    <>
      <PageTitleSetter title="Overview" />
      <div className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-2 text-xl font-bold">{babyAccess.name}</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            {babyAccess.birthDate && (
              <p>
                Birth Date:
                {' '}
                {new Date(babyAccess.birthDate).toLocaleDateString()}
              </p>
            )}
            <p>
              Your Role:
              {babyAccess.caregiverLabel || 'Caregiver'}
            </p>
            <p>
              Access Level:
              {babyAccess.accessLevel}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Latest Logs</h3>
          <p className="text-sm text-muted-foreground">
            Recent entries and quick add shortcuts will appear here
          </p>
        </div>
      </div>
    </>
  );
}
