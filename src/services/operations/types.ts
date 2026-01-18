/**
 * Operations Layer Types
 *
 * Defines the result types and helper functions for the centralized operations layer.
 * All write operations return OperationResult<T> for consistent error handling.
 */

/**
 * Standard result type for all operations
 */
export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Helper to create a success result
 */
export function success<T>(data: T): OperationResult<T> {
  return { success: true, data };
}

/**
 * Helper to create an error result
 */
export function failure<T>(error: string): OperationResult<T> {
  return { success: false, error };
}

/**
 * Type guard to check if operation succeeded
 */
export function isSuccess<T>(
  result: OperationResult<T>
): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if operation failed
 */
export function isFailure<T>(
  result: OperationResult<T>
): result is { success: false; error: string } {
  return result.success === false;
}

/**
 * User context required for most operations
 */
export interface UserContext {
  localId: string;
  clerkUserId: string;
  email?: string;
}

/**
 * Check if we're running in client-side context
 */
export function isClientSide(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Generate a unique mutation ID for outbox
 */
export function generateMutationId(): string {
  return crypto.randomUUID();
}
