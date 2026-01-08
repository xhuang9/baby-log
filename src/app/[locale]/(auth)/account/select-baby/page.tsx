import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessSchema,
  userSchema,
} from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { SelectBabyForm } from './SelectBabyForm';

export const dynamic = 'force-dynamic';

export default async function SelectBabyPage(props: {
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

  // Get all babies the user has access to
  const babies = await db
    .select({
      babyId: babiesSchema.id,
      name: babiesSchema.name,
      accessLevel: babyAccessSchema.accessLevel,
      caregiverLabel: babyAccessSchema.caregiverLabel,
      lastAccessedAt: babyAccessSchema.lastAccessedAt,
      birthDate: babiesSchema.birthDate,
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

  // If no babies or only one, redirect to resolve
  if (babies.length <= 1) {
    redirect(getI18nPath('/account/resolve', locale));
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Select a Baby</h1>
          <p className="text-sm text-muted-foreground">
            Choose which baby you'd like to track
          </p>
        </div>

        <SelectBabyForm
          babies={babies}
          currentDefaultId={localUser.defaultBabyId}
          redirectPath={getI18nPath('/overview', locale)}
        />
      </div>
    </div>
  );
}
