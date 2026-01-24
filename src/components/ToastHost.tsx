'use client';

/**
 * ToastHost Component
 *
 * Consumes the ToastStore queue and renders toasts via Sonner.
 * This bridges the Zustand store with the Sonner toast library.
 *
 * Place this component once in the root layout, alongside the Toaster.
 *
 * @see .readme/planning/16-notification.md
 */

import type { QueuedToast } from '@/stores/useToastStore';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useToastStore } from '@/stores/useToastStore';

// Module-level set to track processed toast IDs
// Using UUIDs, so no cleanup needed - duplicates are impossible
const processedToasts = new Set<string>();

export function ToastHost() {
  const queue = useToastStore(state => state.queue);
  const dequeue = useToastStore(state => state.dequeue);

  useEffect(() => {
    // Process any new toasts in the queue
    for (const queuedToast of queue) {
      // Skip if already processed (UUIDs ensure uniqueness)
      if (processedToasts.has(queuedToast.id)) {
        continue;
      }

      // Mark as processed
      processedToasts.add(queuedToast.id);

      // Show the toast via Sonner
      showToast(queuedToast);

      // Remove from queue immediately
      dequeue(queuedToast.id);
    }
  }, [queue, dequeue]);

  return null;
}

/**
 * Show a toast using Sonner based on the queued toast data
 */
function showToast(queuedToast: QueuedToast) {
  const { variant, message, title, duration } = queuedToast;

  const options = {
    duration,
    description: title ? message : undefined,
  };

  // If there's a title, use it as the main message
  const mainMessage = title ?? message;

  switch (variant) {
    case 'success':
      toast.success(mainMessage, options);
      break;
    case 'error':
      toast.error(mainMessage, options);
      break;
    case 'warning':
      toast.warning(mainMessage, options);
      break;
    case 'info':
      toast.info(mainMessage, options);
      break;
    default:
      toast(mainMessage, options);
  }
}
