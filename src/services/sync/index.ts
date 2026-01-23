/**
 * Sync Service
 *
 * Client-side service for bidirectional data synchronization.
 * Handles pulling changes from server and pushing mutations from outbox.
 *
 * @see .readme/planning/03-sync-api-endpoints.md
 */

// Apply changes (for individual entity types)
export {
  applyBabyChange,
  applyChange,
  applyFeedLogChange,
  applyNappyLogChange,
  applySleepLogChange,
} from './apply';

// Conflict resolution
export { applyServerData } from './conflict';

// Full bidirectional sync
export { performFullSync } from './full-sync';

// Pull changes from server
export { pullChanges } from './pull';

// Push changes to server (flush outbox)
export { flushOutbox } from './push';

// Types
export type {
  MutationResult,
  PullResponse,
  PushResponse,
  SyncChange,
  SyncResult,
} from './types';
