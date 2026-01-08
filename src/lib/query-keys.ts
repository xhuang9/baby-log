/**
 * TanStack Query Key Factory
 *
 * Provides type-safe, hierarchical query keys for cache management.
 * Keys follow the pattern: [domain, scope, ...params]
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

export const queryKeys = {
  // ============================================================================
  // Sync Operations
  // ============================================================================

  sync: {
    all: ['sync'] as const,
    /** Check if updates are available for a baby */
    version: (babyId: number) => ['sync', 'version', babyId] as const,
    /** Pull changes since cursor */
    changes: (babyId: number, cursor: number) =>
      ['sync', 'changes', babyId, cursor] as const,
  },

  // ============================================================================
  // Babies
  // ============================================================================

  babies: {
    all: ['babies'] as const,
    lists: () => ['babies', 'list'] as const,
    /** List all babies user has access to */
    list: () => ['babies', 'list'] as const,
    details: () => ['babies', 'detail'] as const,
    /** Get specific baby details */
    detail: (babyId: number) => ['babies', 'detail', babyId] as const,
  },

  // ============================================================================
  // Feed Logs
  // ============================================================================

  feedLogs: {
    all: ['feedLogs'] as const,
    lists: () => ['feedLogs', 'list'] as const,
    /** List feed logs for a baby */
    list: (babyId: number) => ['feedLogs', 'list', babyId] as const,
    /** List feed logs with date filter */
    listByDate: (babyId: number, date: string) =>
      ['feedLogs', 'list', babyId, date] as const,
    details: () => ['feedLogs', 'detail'] as const,
    /** Get specific feed log */
    detail: (feedLogId: string) => ['feedLogs', 'detail', feedLogId] as const,
    /** Latest feed for a baby */
    latest: (babyId: number) => ['feedLogs', 'latest', babyId] as const,
  },

  // ============================================================================
  // Baby Access
  // ============================================================================

  babyAccess: {
    all: ['babyAccess'] as const,
    /** Get user's access to a baby */
    forBaby: (babyId: number) => ['babyAccess', babyId] as const,
    /** Get all babies user can access */
    userBabies: () => ['babyAccess', 'userBabies'] as const,
  },

  // ============================================================================
  // Outbox (for offline mutations)
  // ============================================================================

  outbox: {
    all: ['outbox'] as const,
    /** Pending mutations count */
    pendingCount: () => ['outbox', 'pending', 'count'] as const,
    /** All pending mutations */
    pending: () => ['outbox', 'pending'] as const,
  },
} as const;

// ============================================================================
// Type Helpers
// ============================================================================

/** Extract query key type from a query key factory function */
export type QueryKeyOf<T extends (...args: never[]) => readonly unknown[]>
  = ReturnType<T>;
