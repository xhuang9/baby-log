/**
 * Toast Store
 *
 * Simple queue store for decoupled toast triggering.
 * Allows calling `useToastStore.getState().enqueue(...)` from anywhere,
 * including non-React contexts like server action callbacks.
 *
 * ToastHost component (Session 3) will consume the queue and render via Sonner.
 *
 * @see .readme/planning/16-notification.md
 */

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type QueuedToast = {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
};

type ToastStore = {
  queue: QueuedToast[];
  enqueue: (toast: Omit<QueuedToast, 'id'>) => string;
  dequeue: (id: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastStore>(set => ({
  queue: [],

  enqueue: (toast) => {
    const id = crypto.randomUUID();
    set(state => ({
      queue: [...state.queue, { ...toast, id }],
    }));
    return id;
  },

  dequeue: (id) => {
    set(state => ({
      queue: state.queue.filter(t => t.id !== id),
    }));
  },

  clear: () => {
    set({ queue: [] });
  },
}));

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Enqueue a success toast
 */
export function toastSuccess(message: string, title?: string) {
  return useToastStore.getState().enqueue({
    variant: 'success',
    message,
    title,
    duration: 3000,
  });
}

/**
 * Enqueue an error toast
 */
export function toastError(message: string, title?: string) {
  return useToastStore.getState().enqueue({
    variant: 'error',
    message,
    title,
    duration: 5000,
  });
}

/**
 * Enqueue a warning toast
 */
export function toastWarning(message: string, title?: string) {
  return useToastStore.getState().enqueue({
    variant: 'warning',
    message,
    title,
    duration: 5000,
  });
}

/**
 * Enqueue an info toast
 */
export function toastInfo(message: string, title?: string) {
  return useToastStore.getState().enqueue({
    variant: 'info',
    message,
    title,
    duration: 3000,
  });
}
