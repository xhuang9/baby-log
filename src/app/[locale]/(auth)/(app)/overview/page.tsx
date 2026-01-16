import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { PageTitleSetter } from '@/components/navigation/PageTitleSetter';
import { db } from '@/lib/db';
import { userSchema } from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { OverviewContent } from './_components/OverviewContent';

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

  // Minimal server check - just get defaultBabyId
  const [localUser] = await db
    .select({ defaultBabyId: userSchema.defaultBabyId })
    .from(userSchema)
    .where(eq(userSchema.clerkId, userId))
    .limit(1);

  if (!localUser?.defaultBabyId) {
    redirect(getI18nPath('/account/bootstrap', locale));
  }

  return (
    <>
      <PageTitleSetter title="Overview" />
      <OverviewContent babyId={localUser.defaultBabyId} />
    </>
  );
}
