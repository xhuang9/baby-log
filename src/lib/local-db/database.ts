/**
 * Local-First Database (Dexie/IndexedDB)
 *
 * This is the immediate read model for the dashboard UI.
 * Server (Postgres) remains the canonical truth.
 *
 * Architecture:
 * - UI reads from IndexedDB first (instant)
 * - TanStack Query schedules sync pulls
 * - Server changes are applied to IndexedDB
 * - Conflicts resolved via Last-Write-Wins (LWW)
 *
 * @see .readme/planning/01-state-management-sync.md for sync strategy
 * @see .readme/planning/02-offline-first-architecture.md for offline patterns
 * @see .readme/user/qa.md for versioning documentation
 */

import type { EntityTable } from 'dexie';
import type { LocalBaby, LocalBabyAccess, LocalUIConfig, LocalUser } from './types/entities';
import type { LocalFeedLog, LocalNappyLog, LocalSleepLog } from './types/logs';
import type { OutboxEntry } from './types/outbox';
import type { AuthSession, LocalSyncStatus, SyncMeta } from './types/sync';
import Dexie from 'dexie';

// ============================================================================
// Database Class
// ============================================================================

class BabyLogDatabase extends Dexie {
  // Log tables
  feedLogs!: EntityTable<LocalFeedLog, 'id'>;
  sleepLogs!: EntityTable<LocalSleepLog, 'id'>;
  nappyLogs!: EntityTable<LocalNappyLog, 'id'>;

  // Entity tables
  babies!: EntityTable<LocalBaby, 'id'>;
  babyAccess!: EntityTable<LocalBabyAccess, 'userId'>;
  users!: EntityTable<LocalUser, 'id'>;
  uiConfig!: EntityTable<LocalUIConfig, 'userId'>;

  // Sync management tables
  syncMeta!: EntityTable<SyncMeta, 'babyId'>;
  syncStatus!: EntityTable<LocalSyncStatus, 'entityType'>;
  outbox!: EntityTable<OutboxEntry, 'mutationId'>;

  // Auth session for offline access
  authSession!: EntityTable<AuthSession, 'id'>;

  constructor() {
    super('baby-log');

    // ========================================================================
    // Version History
    // ========================================================================
    // IMPORTANT: Before production, add proper versioning with migrations.
    // Current schema is development-only and will be reset for production.
    // ========================================================================

    // Version 1: Complete schema (development)
    this.version(1).stores({
      // Log tables - all use consistent [babyId+startedAt] compound index
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      // Entity tables
      babies: 'id, ownerUserId',
      babyAccess: '[userId+babyId], userId, babyId',
      users: 'id, clerkId',
      uiConfig: 'userId',
      // Sync management
      syncMeta: 'babyId',
      syncStatus: 'entityType',
      outbox: 'mutationId, status, createdAt, entityType',
      // Auth session
      authSession: 'id',
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const localDb = new BabyLogDatabase();
