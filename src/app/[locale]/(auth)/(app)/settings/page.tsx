import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { db } from '@/libs/DB';
import {
  babiesSchema,
  babyAccessSchema,
  userSchema,
} from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { SettingsContent } from './SettingsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Settings',
  };
}

export const dynamic = 'force-dynamic';

export default async function SettingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { userId } = await auth();

  if (!userId) {
    redirect(getI18nPath('/sign-in', locale));
  }

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
      birthDate: babiesSchema.birthDate,
      gender: babiesSchema.gender,
      accessLevel: babyAccessSchema.accessLevel,
      caregiverLabel: babyAccessSchema.caregiverLabel,
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
    .orderBy(desc(babyAccessSchema.accessLevel));

  return (
    <>
      <PageTitleSetter title="Settings" />
      <SettingsContent babies={babies} locale={locale} />
    </>
  );
}
