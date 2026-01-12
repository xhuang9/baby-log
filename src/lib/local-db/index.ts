/**
 * Local-First Database (Dexie/IndexedDB)
 *
 * This module provides local-first data storage using IndexedDB via Dexie.js.
 * Server (Postgres) remains the canonical truth; this is the local cache.
 *
 * @example
 * ```typescript
 * import { localDb, saveFeedLogs, getFeedLogsForBaby } from '@/lib/local-db';
 *
 * // Save logs
 * await saveFeedLogs(logs);
 *
 * // Query logs
 * const recentLogs = await getFeedLogsForBaby(babyId, 10);
 * ```
 *
 * @see .readme/planning/01-state-management-sync.md for sync strategy
 * @see .readme/planning/02-offline-first-architecture.md for offline patterns
 * @see .readme/user/qa.md for versioning documentation
 */

// Database instance
export { localDb } from './database';

// Helpers
export * from './helpers';

// Types
export * from './types';
