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

// Activity log operations
export type {
  CreateActivityLogInput,
  UpdateActivityLogInput,
} from './activity-log';

export {
  createActivityLog,
  deleteActivityLog,
  updateActivityLog,
} from './activity-log';

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

// Bath log operations
export type {
  CreateBathLogInput,
  UpdateBathLogInput,
} from './bath-log';

export {
  createBathLog,
  deleteBathLog,
  updateBathLog,
} from './bath-log';

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

// Growth log operations
export type {
  CreateGrowthLogInput,
  UpdateGrowthLogInput,
} from './growth-log';

export {
  createGrowthLog,
  deleteGrowthLog,
  updateGrowthLog,
} from './growth-log';

// Medication log operations
export type {
  CreateMedicationLogInput,
  UpdateMedicationLogInput,
} from './medication-log';

export {
  createMedicationLog,
  deleteMedicationLog,
  updateMedicationLog,
} from './medication-log';

// Medication type operations
export type {
  CreateMedicationTypeInput,
} from './medication-types';

export {
  createMedicationType,
  deleteMedicationType,
} from './medication-types';

// Nappy log operations
export type {
  CreateNappyLogInput,
} from './nappy-log';

export {
  createNappyLog,
} from './nappy-log';

// Pumping log operations
export type {
  CreatePumpingLogInput,
  UpdatePumpingLogInput,
} from './pumping-log';

export {
  createPumpingLog,
  deletePumpingLog,
  updatePumpingLog,
} from './pumping-log';

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

// Solids log operations
export type {
  CreateSolidsLogInput,
  UpdateSolidsLogInput,
} from './solids-log';

export {
  createSolidsLog,
  deleteSolidsLog,
  updateSolidsLog,
} from './solids-log';

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
  UpdateWidgetSettingsInput,
} from './ui-config';

export {
  updateHandMode,
  updateUIConfigByKey,
  updateWidgetSettings,
} from './ui-config';
