/**
 * Outbox Types for Local Database
 *
 * Types for offline mutation queue (outbox pattern).
 * Mutations are queued locally and synced when online.
 */

// ============================================================================
// Outbox Types
// ============================================================================

export type OutboxEntityType = 'feed_log' | 'sleep_log' | 'nappy_log' | 'solids_log' | 'pumping_log' | 'growth_log' | 'bath_log' | 'medication_log' | 'activity_log' | 'baby' | 'food_type' | 'medication_type';
export type OutboxOperation = 'create' | 'update' | 'delete';
export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type OutboxEntry = {
  mutationId: string; // UUID, unique
  entityType: OutboxEntityType;
  entityId: string; // UUID of the entity
  op: OutboxOperation;
  payload: unknown; // Full row or patch
  createdAt: Date;
  status: OutboxStatus;
  lastAttemptAt: Date | null;
  errorMessage: string | null;
};
