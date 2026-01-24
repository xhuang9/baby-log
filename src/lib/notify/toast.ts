/**
 * Toast Notification API
 *
 * Wrapper for toast notifications that uses the ToastStore.
 * Can be called from anywhere including non-React contexts.
 *
 * @example
 * import { notifyToast } from '@/lib/notify';
 *
 * // Simple usage
 * notifyToast.success('Settings saved');
 * notifyToast.error('Failed to save');
 *
 * // With title
 * notifyToast.success('Your changes have been saved', 'Success');
 *
 * // With custom duration
 * notifyToast.info('Processing...', undefined, 10000);
 *
 * @see .readme/planning/16-notification.md
 */

import {
  toastError,
  toastInfo,
  toastSuccess,
  toastWarning,
  useToastStore,
} from '@/stores/useToastStore';

export type { QueuedToast, ToastVariant } from '@/stores/useToastStore';

/**
 * Toast notification API
 */
export const notifyToast = {
  /**
   * Show a success toast (3s duration)
   */
  success: (message: string, title?: string, duration?: number) => {
    if (duration) {
      return useToastStore.getState().enqueue({
        variant: 'success',
        message,
        title,
        duration,
      });
    }
    return toastSuccess(message, title);
  },

  /**
   * Show an error toast (5s duration)
   */
  error: (message: string, title?: string, duration?: number) => {
    if (duration) {
      return useToastStore.getState().enqueue({
        variant: 'error',
        message,
        title,
        duration,
      });
    }
    return toastError(message, title);
  },

  /**
   * Show a warning toast (5s duration)
   */
  warning: (message: string, title?: string, duration?: number) => {
    if (duration) {
      return useToastStore.getState().enqueue({
        variant: 'warning',
        message,
        title,
        duration,
      });
    }
    return toastWarning(message, title);
  },

  /**
   * Show an info toast (3s duration)
   */
  info: (message: string, title?: string, duration?: number) => {
    if (duration) {
      return useToastStore.getState().enqueue({
        variant: 'info',
        message,
        title,
        duration,
      });
    }
    return toastInfo(message, title);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (id: string) => {
    useToastStore.getState().dequeue(id);
  },

  /**
   * Clear all toasts
   */
  clear: () => {
    useToastStore.getState().clear();
  },
};
