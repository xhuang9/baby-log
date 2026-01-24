/**
 * Notify API
 *
 * Unified exports for toast and system notifications.
 *
 * @example
 * import { notifyToast, notifySystem } from '@/lib/notify';
 *
 * // Toast for immediate user feedback
 * notifyToast.success('Settings saved');
 * notifyToast.error('Failed to save');
 *
 * // System log for background events
 * notifySystem.error({
 *   userId: 123,
 *   title: 'Sync Failed',
 *   message: 'Unable to sync changes',
 *   category: 'sync',
 * });
 */

export { notifySystem } from './system';
export type { NotifySystemOptions } from './system';
export { notifyToast } from './toast';
export type { QueuedToast, ToastVariant } from './toast';
