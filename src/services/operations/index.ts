/**
 * Operations Layer - Main Exports
 *
 * Centralized write operations for the application.
 * All mutations follow the pattern:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores for instant UI feedback
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

// Core types
export type {
  OperationResult,
  UserContext,
} from './types';

export {
  success,
  failure,
  isSuccess,
  isFailure,
  isClientSide,
  generateMutationId,
} from './types';

// Baby operations
export type {
  CreateBabyInput,
  UpdateBabyInput,
} from './baby';

export {
  createBaby,
  updateBabyProfile,
  setDefaultBaby,
  deleteBaby,
} from './baby';

// Feed log operations
export type {
  CreateFeedLogInput,
} from './feed-log';

export {
  createFeedLog,
} from './feed-log';

// Sleep log operations
export type {
  CreateSleepLogInput,
} from './sleep-log';

export {
  createSleepLog,
} from './sleep-log';

// UI config operations
export type {
  UpdateThemeInput,
  UpdateHandModeInput,
  UpdateWidgetSettingsInput,
} from './ui-config';

export {
  updateTheme,
  updateHandMode,
  updateWidgetSettings,
  updateUIConfigByKey,
} from './ui-config';

// Auth operations
export {
  signOutCleanup,
} from './auth';
