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

// Auth operations
export {
  signOutCleanup,
} from './auth';

// Baby operations
export type {
  CreateBabyInput,
  UpdateBabyInput,
} from './baby/index';

export {
  createBaby,
  deleteBaby,
  setDefaultBaby,
  updateBabyProfile,
} from './baby/index';

// Feed log operations
export type {
  CreateFeedLogInput,
  UpdateFeedLogInput,
} from './feed-log';

export {
  createFeedLog,
  deleteFeedLog,
  updateFeedLog,
} from './feed-log';

// Nappy log operations
export type {
  CreateNappyLogInput,
} from './nappy-log';

export {
  createNappyLog,
} from './nappy-log';

// Sleep log operations
export type {
  CreateSleepLogInput,
  UpdateSleepLogInput,
} from './sleep-log';

export {
  createSleepLog,
  deleteSleepLog,
  updateSleepLog,
} from './sleep-log';

// Core types
export type {
  OperationResult,
  UserContext,
} from './types';

export {
  failure,
  generateMutationId,
  isClientSide,
  isFailure,
  isSuccess,
  success,
} from './types';

// UI config operations
export type {
  UpdateHandModeInput,
  UpdateThemeInput,
  UpdateWidgetSettingsInput,
} from './ui-config';

export {
  updateHandMode,
  updateTheme,
  updateUIConfigByKey,
  updateWidgetSettings,
} from './ui-config';
