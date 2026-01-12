/**
 * Sync Types for Local Database
 *
 * Types for tracking synchronization state between
 * local IndexedDB and remote Postgres database.
 */

// ============================================================================
// Sync Entity Types
// ============================================================================

export type SyncEntityType
  = | 'user'
    | 'babies'
    | 'baby_access'
    | 'feed_logs'
    | 'sleep_logs'
    | 'nappy_logs'
    | 'ui_config'
    | 'bootstrap';

export type SyncStatusValue = 'idle' | 'syncing' | 'complete' | 'error';

// ============================================================================
// Sync Status
// ============================================================================

export type LocalSyncStatus = {
  entityType: SyncEntityType; // Primary key
  status: SyncStatusValue;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  progress: number | null; // 0-100 for progressive sync
};

// ============================================================================
// Sync Metadata
// ============================================================================

export type SyncMeta = {
  babyId: number; // Primary key
  cursor: number; // Monotonic cursor for delta sync
  lastSyncAt: Date;
};

// ============================================================================
// Auth Session (Offline Auth Bypass)
// ============================================================================

/**
 * Stores session marker for offline authentication bypass.
 * When a user has previously authenticated and we have cached data,
 * this allows them to access the app offline without Clerk validation.
 */
export type AuthSession = {
  id: 'current'; // Singleton - only one session record
  userId: number; // Local user ID from users table
  clerkId: string; // Clerk user ID for validation
  lastAuthAt: Date; // Last successful authentication timestamp
  expiresAt: Date | null; // Optional expiration (null = no expiration)
};
