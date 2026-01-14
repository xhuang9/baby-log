'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { userSchema } from '@/models/Schema';
import { getLocalUserByClerkId } from '@/services/baby-access';

type HandPreference = 'left' | 'right' | 'both' | 'unknown';

type UpdateHandPreferenceResult
  = | { success: true }
    | { success: false; error: string };

export async function updateHandPreference(
  handPreference: HandPreference,
): Promise<UpdateHandPreferenceResult> {
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

    await db
      .update(userSchema)
      .set({ handPreference })
      .where(eq(userSchema.id, localUser.id));

    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Error updating hand preference:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
