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
import type { LocalBaby, LocalBabyAccess, LocalBabyInvite, LocalUIConfig, LocalUser } from './types/entities';
import type { LocalFoodType } from './types/food-types';
import type { LocalFeedLog, LocalNappyLog, LocalSleepLog, LocalSolidsLog } from './types/logs';
import type { LocalNotification } from './types/notifications';
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
  solidsLogs!: EntityTable<LocalSolidsLog, 'id'>;

  // Entity tables
  babies!: EntityTable<LocalBaby, 'id'>;
  babyAccess!: EntityTable<LocalBabyAccess, 'userId'>;
  babyInvites!: EntityTable<LocalBabyInvite, 'id'>;
  users!: EntityTable<LocalUser, 'id'>;
  uiConfig!: EntityTable<LocalUIConfig, 'userId'>;
  foodTypes!: EntityTable<LocalFoodType, 'id'>;

  // Sync management tables
  syncMeta!: EntityTable<SyncMeta, 'babyId'>;
  syncStatus!: EntityTable<LocalSyncStatus, 'entityType'>;
  outbox!: EntityTable<OutboxEntry, 'mutationId'>;

  // Auth session for offline access
  authSession!: EntityTable<AuthSession, 'id'>;

  // Notifications
  notifications!: EntityTable<LocalNotification, 'id'>;

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
      babyInvites: 'id, babyId, status, inviteType, [babyId+status]',
      users: 'id, clerkId',
      uiConfig: 'userId',
      // Sync management
      syncMeta: 'babyId',
      syncStatus: 'entityType',
      outbox: 'mutationId, status, createdAt, entityType',
      // Auth session
      authSession: 'id',
      // Notifications
      notifications: 'id, userId, createdAt, readAt, category, severity, babyId, dedupeKey',
    });

    // Version 2: Rename texture -> consistency with value migration
    this.version(2).stores({
      // Schema unchanged, just data migration
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]',
    }).upgrade(async (tx) => {
      // Map old texture values to new consistency values
      const textureToConsistencyMap: Record<string, string> = {
        veryRunny: 'watery',
        runny: 'runny',
        mushy: 'mushy',
        mucusy: 'pasty',
        solid: 'formed',
        littleBalls: 'hardPellets',
      };

      // Migrate all nappy logs
      await tx.table('nappyLogs').toCollection().modify((log: Record<string, unknown>) => {
        // Rename texture to consistency with value mapping
        if ('texture' in log) {
          const oldTexture = log.texture as string | null;
          log.consistency = oldTexture ? (textureToConsistencyMap[oldTexture] ?? null) : null;
          delete log.texture;
        }
      });
    });

    // Version 3: Add solids logs table
    this.version(3).stores({
      solidsLogs: 'id, babyId, startedAt, [babyId+startedAt]',
    });

    // Version 4: Add food types table
    this.version(4).stores({
      foodTypes: 'id, userId',
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const localDb = new BabyLogDatabase();
