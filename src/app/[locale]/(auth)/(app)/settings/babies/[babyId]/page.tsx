import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { and, eq, sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { BreadcrumbSetter } from '@/components/navigation/BreadcrumbSetter';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessSchema,
  userSchema,
} from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { EditBabyForm } from './EditBabyForm';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; babyId: string }>;
}): Promise<Metadata> {
  await props.params;

  return {
    title: 'Edit Baby',
  };
}

export const dynamic = 'force-dynamic';

export default async function EditBabyPage(props: {
  params: Promise<{ locale: string; babyId: string }>;
}) {
  const { locale, babyId } = await props.params;
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
    redirect(getI18nPath('/account/bootstrap', locale));
  }

  // Get baby details and verify access
  const [babyData] = await db
    .select({
      babyId: babiesSchema.id,
      name: babiesSchema.name,
      birthDate: babiesSchema.birthDate,
      gender: babiesSchema.gender,
      birthWeightG: babiesSchema.birthWeightG,
      accessLevel: babyAccessSchema.accessLevel,
      caregiverLabel: babyAccessSchema.caregiverLabel,
      archivedAt: babiesSchema.archivedAt,
    })
    .from(babyAccessSchema)
    .innerJoin(babiesSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
    .where(
      and(
        eq(babyAccessSchema.userId, localUser.id),
        eq(babiesSchema.id, Number.parseInt(babyId, 10)),
        sql`${babiesSchema.archivedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!babyData) {
    notFound();
  }

  // Only owners and editors can edit
  if (babyData.accessLevel === 'viewer') {
    redirect(getI18nPath('/settings', locale));
  }

  return (
    <>
      <BreadcrumbSetter
        items={[
          { label: 'Settings', href: getI18nPath('/settings', locale) },
          { label: 'Edit Baby' },
        ]}
      />
      <div className="mr-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Edit Baby</h1>
          <p className="text-sm text-muted-foreground">
            Update
            {' '}
            {babyData.name}
            's information
          </p>
        </div>

        <EditBabyForm
          babyId={babyData.babyId}
          initialData={{
            name: babyData.name,
            birthDate: babyData.birthDate,
            gender: babyData.gender,
            birthWeightG: babyData.birthWeightG,
            caregiverLabel: babyData.caregiverLabel,
          }}
          redirectPath={getI18nPath('/settings', locale)}
        />
      </div>
    </>
  );
}
