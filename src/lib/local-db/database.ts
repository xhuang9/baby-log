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
  babyAccess!: EntityTable<LocalBabyAccess, 'oduserId'>;
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
    // IMPORTANT: Never delete old versions - users need them to upgrade.
    // See .readme/user/qa.md for versioning documentation.
    // ========================================================================

    // Version 1: Initial schema
    this.version(1).stores({
      feedLogs: 'id, babyId, startedAt, createdAt',
      babies: 'id',
      babyAccess: '[oduserId+babyId], oduserId, babyId',
      syncMeta: 'babyId',
      outbox: 'mutationId, status, createdAt, entityType',
    });

    // Version 2: Add user, uiConfig, syncStatus tables
    this.version(2).stores({
      feedLogs: 'id, babyId, startedAt, createdAt',
      babies: 'id, ownerUserId',
      babyAccess: '[oduserId+babyId], oduserId, babyId',
      users: 'id, clerkId',
      uiConfig: 'userId',
      syncMeta: 'babyId',
      syncStatus: 'entityType',
      outbox: 'mutationId, status, createdAt, entityType',
    });

    // Version 3: Add sleepLogs and nappyLogs tables
    // Also updated feedLogs index to use compound [babyId+startedAt]
    this.version(3).stores({
      // Log tables - all use consistent [babyId+startedAt] compound index
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      // Entity tables
      babies: 'id, ownerUserId',
      babyAccess: '[oduserId+babyId], oduserId, babyId',
      users: 'id, clerkId',
      uiConfig: 'userId',
      // Sync management
      syncMeta: 'babyId',
      syncStatus: 'entityType',
      outbox: 'mutationId, status, createdAt, entityType',
    });

    // Version 4: Add authSession table for offline authentication bypass
    // Stores session marker to allow offline access to previously authenticated users
    this.version(4).stores({
      // Log tables - unchanged
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      // Entity tables - unchanged
      babies: 'id, ownerUserId',
      babyAccess: '[oduserId+babyId], oduserId, babyId',
      users: 'id, clerkId',
      uiConfig: 'userId',
      // Sync management - unchanged
      syncMeta: 'babyId',
      syncStatus: 'entityType',
      outbox: 'mutationId, status, createdAt, entityType',
      // Auth session - new
      authSession: 'id',
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const localDb = new BabyLogDatabase();
