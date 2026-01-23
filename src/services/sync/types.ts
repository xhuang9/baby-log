/**
 * Sync Service Types
 *
 * Defines types for the bidirectional sync system.
 */

/**
 * A change from the server to apply locally
 */
export type SyncChange = {
  type: string;
  op: 'create' | 'update' | 'delete';
  id: number;
  data: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Response from the pull API endpoint
 */
export type PullResponse = {
  changes: SyncChange[];
  nextCursor: number;
  hasMore: boolean;
};

/**
 * Result of a single mutation push
 */
export type MutationResult = {
  mutationId: string;
  status: 'success' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
};

/**
 * Response from the push API endpoint
 */
export type PushResponse = {
  results: MutationResult[];
  newCursor: number | null;
};

/**
 * Result of a sync operation
 */
export type SyncResult = {
  success: boolean;
  error?: string;
  errorType?: 'access_revoked' | 'network' | 'unknown';
  revokedBabyId?: number;
  changesApplied?: number;
};
