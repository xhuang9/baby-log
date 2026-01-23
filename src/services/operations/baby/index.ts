/**
 * Baby Operations
 *
 * Centralized operations for baby CRUD. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores for instant UI feedback
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

// Operations
export { createBaby } from './create';

export { deleteBaby } from './delete';
export { setDefaultBaby } from './set-default';
// Types
export type { CreateBabyInput, UpdateBabyInput } from './types';
export { updateBabyProfile } from './update';
