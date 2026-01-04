import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { getI18nPath } from '@/utils/Helpers';
import { PostAuthClient } from './PostAuthClient';

export const dynamic = 'force-dynamic';

type ClerkUserPayload = {
  id: string;
  firstName: string | null;
  email: string | null;
  imageUrl: string;
};

export default async function PostAuthPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { userId } = await auth();

  if (!userId) {
    redirect(getI18nPath('/sign-in', locale));
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const firstName = clerkUser.firstName ?? null;

  await db
    .insert(userSchema)
    .values({
      clerkId: clerkUser.id,
      email,
      firstName,
    })
    .onConflictDoUpdate({
      target: userSchema.clerkId,
      set: {
        clerkId: clerkUser.id,
        email,
        firstName,
      },
    });

  const userPayload: ClerkUserPayload = {
    id: clerkUser.id,
    firstName,
    email,
    imageUrl: clerkUser.imageUrl,
  };

  return (
    <PostAuthClient
      user={userPayload}
      redirectTo={getI18nPath('/dashboard', locale)}
    />
  );
}
