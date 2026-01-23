/**
 * Auth Utilities
 *
 * Helper functions for authentication in server actions.
 */

import { auth } from '@clerk/nextjs/server';
import { getLocalUserByClerkId } from '@/services/baby-access';

/**
 * Get authenticated user context for server actions
 * Returns the local user record if authenticated
 */
export async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) {
    return { success: false as const, error: 'Not authenticated' };
  }

  const userResult = await getLocalUserByClerkId(userId);
  if (!userResult.success) {
    return userResult;
  }

  return {
    success: true as const,
    clerkId: userId,
    localUser: userResult.data,
  };
}
