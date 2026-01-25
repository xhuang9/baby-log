/**
 * Push Request Handler Module
 *
 * Orchestrates the processing of push mutations.
 * Encapsulates business logic separate from HTTP layer.
 */

import type { Mutation, MutationResult, PushResponse } from './types';
import { getLatestGlobalSyncCursor } from '@/lib/db/helpers/sync-events';
import { getUserEditableBabyIds } from './access';
import { processMutation } from './mutations';

/**
 * Handle push request - process mutations and return results
 *
 * @param clerkId - Clerk user ID
 * @param mutations - Array of mutations to process
 * @returns Push response with results and new cursor
 * @throws Error if user not found
 */
export async function handlePushRequest(
  clerkId: string,
  mutations: Mutation[],
): Promise<PushResponse> {
  // Get user and editable baby IDs
  const { userId, editableBabyIds } = await getUserEditableBabyIds(clerkId);

  if (!userId) {
    throw new Error('User not found');
  }

  // Process mutations
  const results: MutationResult[] = [];

  for (const mutation of mutations) {
    const result = await processMutation(
      mutation,
      userId,
      editableBabyIds,
    );
    results.push(result);
  }

  // Get latest cursor after all mutations
  const newCursor = await getLatestGlobalSyncCursor();

  return {
    results,
    newCursor,
  };
}
