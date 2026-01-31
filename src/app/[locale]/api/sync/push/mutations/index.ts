/**
 * Mutations Index
 *
 * Dispatches mutations to the appropriate entity processor.
 */

import type { Mutation, MutationResult } from '../types';
import { processBabyMutation } from './baby';
import { processFeedLogMutation } from './feed-log';
import { processNappyLogMutation } from './nappy-log';
import { processSleepLogMutation } from './sleep-log';
import { processSolidsLogMutation } from './solids-log';

export { processBabyMutation } from './baby';
export { processFeedLogMutation } from './feed-log';
export { processNappyLogMutation } from './nappy-log';
export { processSleepLogMutation } from './sleep-log';
export { processSolidsLogMutation } from './solids-log';

/**
 * Process a single mutation and return the result
 */
export async function processMutation(
  mutation: Mutation,
  userId: number,
  editableBabyIds: Set<number | null>,
): Promise<MutationResult> {
  const { mutationId, entityType, entityId, op, payload } = mutation;

  try {
    // Baby entities use entityId as the baby ID
    const babyId = entityType === 'baby'
      ? Number.parseInt(entityId, 10)
      : (payload.babyId as number | undefined);

    // Verify user has edit access
    if (entityType === 'baby') {
      // For baby mutations, check if user owns the baby or has editor access
      if (op !== 'create' && babyId && !editableBabyIds.has(babyId)) {
        console.error('[SYNC] Baby mutation access denied:', {
          babyId,
          op,
          userId,
          editableBabyIds: Array.from(editableBabyIds),
        });
        return {
          mutationId,
          status: 'error',
          error: 'Access denied to this baby',
        };
      }
    } else if (babyId && !editableBabyIds.has(babyId)) {
      // For other entities, verify access to the baby
      return {
        mutationId,
        status: 'error',
        error: 'Access denied to this baby',
      };
    }

    switch (entityType) {
      case 'baby':
        return await processBabyMutation(mutationId, entityId, op, payload, userId);
      case 'feed_log':
        return await processFeedLogMutation(mutationId, entityId, op, payload, userId, babyId);
      case 'sleep_log':
        return await processSleepLogMutation(mutationId, entityId, op, payload, userId, babyId);
      case 'nappy_log':
        return await processNappyLogMutation(mutationId, entityId, op, payload, userId, babyId);
      case 'solids_log':
        return await processSolidsLogMutation(mutationId, entityId, op, payload, userId, babyId);
      default:
        return {
          mutationId,
          status: 'error',
          error: `Unknown entity type: ${entityType}`,
        };
    }
  } catch (error) {
    console.error(`Error processing mutation ${mutationId}:`, error);
    return {
      mutationId,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
