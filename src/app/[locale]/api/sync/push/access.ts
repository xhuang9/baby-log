/**
 * Access Control
 *
 * Utilities for checking user access to babies in the push endpoint.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { babyAccessSchema, userSchema } from '@/models/Schema';

/**
 * Get baby IDs that the user can edit (owner or editor access)
 */
export async function getUserEditableBabyIds(clerkId: string): Promise<{
  userId: number | null;
  editableBabyIds: Set<number | null>;
}> {
  // Get local user
  const [localUser] = await db
    .select({ id: userSchema.id })
    .from(userSchema)
    .where(eq(userSchema.clerkId, clerkId))
    .limit(1);

  if (!localUser) {
    return { userId: null, editableBabyIds: new Set() };
  }

  // Get all baby IDs user has edit access to
  const userAccess = await db
    .select({
      babyId: babyAccessSchema.babyId,
      accessLevel: babyAccessSchema.accessLevel,
    })
    .from(babyAccessSchema)
    .where(eq(babyAccessSchema.userId, localUser.id));

  const editableBabyIds = new Set(
    userAccess
      .filter(a => a.accessLevel === 'owner' || a.accessLevel === 'editor')
      .map(a => a.babyId),
  );

  return { userId: localUser.id, editableBabyIds };
}
