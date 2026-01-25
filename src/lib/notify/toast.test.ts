/**
 * Toast Notification API Tests
 *
 * Tests for the notifyToast wrapper API:
 * - Variant-specific methods (success, error, warning, info)
 * - Default and custom durations
 * - Dismiss and clear operations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/stores/useToastStore';
import { notifyToast } from './toast';

// Mock crypto.randomUUID for predictable IDs
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-123'),
});

describe('notifyToast', () => {
  beforeEach(() => {
    useToastStore.setState({ queue: [] });
    vi.clearAllMocks();
  });

  describe('success', () => {
    it('should enqueue with correct variant', () => {
      notifyToast.success('Success message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.variant).toBe('success');
      expect(state.queue[0]?.message).toBe('Success message');
    });

    it('should use default duration (3000ms) when not specified', () => {
      notifyToast.success('Success message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(3000);
    });

    it('should use custom duration when provided', () => {
      notifyToast.success('Success message', 'Title', 10000);

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(10000);
    });

    it('should include title when provided', () => {
      notifyToast.success('Success message', 'Success Title');

      const state = useToastStore.getState();

      expect(state.queue[0]?.title).toBe('Success Title');
    });
  });

  describe('error', () => {
    it('should enqueue with correct variant', () => {
      notifyToast.error('Error message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.variant).toBe('error');
      expect(state.queue[0]?.message).toBe('Error message');
    });

    it('should use default duration (5000ms) when not specified', () => {
      notifyToast.error('Error message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(5000);
    });

    it('should use custom duration when provided', () => {
      notifyToast.error('Error message', undefined, 8000);

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(8000);
    });
  });

  describe('warning', () => {
    it('should enqueue with correct variant', () => {
      notifyToast.warning('Warning message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.variant).toBe('warning');
      expect(state.queue[0]?.message).toBe('Warning message');
    });

    it('should use default duration (5000ms) when not specified', () => {
      notifyToast.warning('Warning message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(5000);
    });

    it('should use custom duration when provided', () => {
      notifyToast.warning('Warning message', 'Warning', 7000);

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(7000);
    });
  });

  describe('info', () => {
    it('should enqueue with correct variant', () => {
      notifyToast.info('Info message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.variant).toBe('info');
      expect(state.queue[0]?.message).toBe('Info message');
    });

    it('should use default duration (3000ms) when not specified', () => {
      notifyToast.info('Info message');

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(3000);
    });

    it('should use custom duration when provided', () => {
      notifyToast.info('Info message', 'Info', 6000);

      const state = useToastStore.getState();

      expect(state.queue[0]?.duration).toBe(6000);
    });
  });

  describe('dismiss', () => {
    it('should call store dequeue', () => {
      // First add a toast
      useToastStore.setState({
        queue: [
          { id: 'toast-to-dismiss', variant: 'success', message: 'Test' },
        ],
      });

      notifyToast.dismiss('toast-to-dismiss');

      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(0);
    });

    it('should not error when dismissing non-existent toast', () => {
      expect(() => {
        notifyToast.dismiss('non-existent');
      }).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should call store clear', () => {
      // Add multiple toasts
      useToastStore.setState({
        queue: [
          { id: 'toast-1', variant: 'success', message: 'First' },
          { id: 'toast-2', variant: 'error', message: 'Second' },
        ],
      });

      notifyToast.clear();

      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(0);
    });
  });

  describe('return values', () => {
    it('should return toast ID from success', () => {
      const id = notifyToast.success('Message');

      expect(id).toBe('test-uuid-123');
    });

    it('should return toast ID from error', () => {
      const id = notifyToast.error('Message');

      expect(id).toBe('test-uuid-123');
    });

    it('should return toast ID from warning', () => {
      const id = notifyToast.warning('Message');

      expect(id).toBe('test-uuid-123');
    });

    it('should return toast ID from info', () => {
      const id = notifyToast.info('Message');

      expect(id).toBe('test-uuid-123');
    });
  });
});
