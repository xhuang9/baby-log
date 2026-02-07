/**
 * Push API Types
 *
 * Type definitions for the mutation push endpoint.
 */

export type MutationOp = 'create' | 'update' | 'delete';
export type EntityType = 'baby' | 'feed_log' | 'sleep_log' | 'nappy_log' | 'solids_log' | 'pumping_log' | 'growth_log' | 'bath_log' | 'food_type';

export type Mutation = {
  mutationId: string;
  entityType: EntityType;
  entityId: string;
  op: MutationOp;
  payload: Record<string, unknown>;
};

export type MutationResult = {
  mutationId: string;
  status: 'success' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
};

export type PushRequest = {
  mutations: Mutation[];
};

export type PushResponse = {
  results: MutationResult[];
  newCursor: number | null;
};
