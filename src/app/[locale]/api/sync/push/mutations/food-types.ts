/**
 * Food Types Mutation Processor
 *
 * Handles create and delete operations for food type entities.
 * Food types are user-scoped (not baby-scoped).
 */

import type { MutationOp, MutationResult } from '../types';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { foodTypesSchema } from '@/models/Schema';

export async function processFoodTypeMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
): Promise<MutationResult> {
  const foodTypeId = entityId;

  if (op === 'create') {
    try {
      // Check for duplicate (case-insensitive)
      const [existing] = await db
        .select()
        .from(foodTypesSchema)
        .where(
          and(
            eq(foodTypesSchema.userId, userId),
            sql`LOWER(${foodTypesSchema.name}) = LOWER(${payload.name as string})`
          )
        )
        .limit(1);

      if (existing) {
        return {
          mutationId,
          status: 'error',
          error: `Food type "${payload.name}" already exists`,
        };
      }

      // Insert food type
      await db.insert(foodTypesSchema).values({
        id: foodTypeId,
        userId,
        name: payload.name as string,
        createdAt: new Date(payload.createdAt as string),
        updatedAt: new Date(payload.updatedAt as string),
      });

      return { mutationId, status: 'success' };
    } catch (error) {
      console.error('Failed to create food type:', error);
      return {
        mutationId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to create food type',
      };
    }
  }

  if (op === 'delete') {
    try {
      // Verify ownership before delete
      const [existing] = await db
        .select()
        .from(foodTypesSchema)
        .where(
          and(
            eq(foodTypesSchema.id, foodTypeId),
            eq(foodTypesSchema.userId, userId)
          )
        )
        .limit(1);

      if (!existing) {
        // Already deleted or not found - consider success
        return { mutationId, status: 'success' };
      }

      // Delete food type
      await db
        .delete(foodTypesSchema)
        .where(eq(foodTypesSchema.id, foodTypeId));

      return { mutationId, status: 'success' };
    } catch (error) {
      console.error('Failed to delete food type:', error);
      return {
        mutationId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to delete food type',
      };
    }
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
