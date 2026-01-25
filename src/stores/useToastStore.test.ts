/**
 * Toast Store Tests
 *
 * Tests for the toast queue store operations:
 * - Queue management (enqueue, dequeue, clear)
 * - Convenience functions with correct durations
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  toastError,
  toastInfo,
  toastSuccess,
  toastWarning,
  useToastStore,
} from './useToastStore';

// Mock crypto.randomUUID for predictable IDs
const mockRandomUUID = vi.fn(() => 'test-uuid-123');
vi.stubGlobal('crypto', {
  randomUUID: mockRandomUUID,
});

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ queue: [] });
    mockRandomUUID.mockReturnValue('test-uuid-123');
  });

  describe('enqueue', () => {
    it('should add toast with generated UUID', () => {
      const id = useToastStore.getState().enqueue({
        variant: 'success',
        message: 'Test message',
      });

      expect(id).toBe('test-uuid-123');

      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]).toEqual({
        id: 'test-uuid-123',
        variant: 'success',
        message: 'Test message',
      });
    });

    it('should preserve queue order (FIFO)', () => {
      // Generate unique IDs for each call
      let callCount = 0;
      mockRandomUUID.mockImplementation(() => `uuid-${++callCount}`);

      useToastStore.getState().enqueue({
        variant: 'success',
        message: 'First',
      });

      useToastStore.getState().enqueue({
        variant: 'error',
        message: 'Second',
      });

      useToastStore.getState().enqueue({
        variant: 'info',
        message: 'Third',
      });

      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(3);
      expect(state.queue[0]?.message).toBe('First');
      expect(state.queue[1]?.message).toBe('Second');
      expect(state.queue[2]?.message).toBe('Third');
    });

    it('should return the generated toast ID', () => {
      mockRandomUUID.mockReturnValue('custom-uuid-456');

      const id = useToastStore.getState().enqueue({
        variant: 'warning',
        message: 'Warning message',
        title: 'Warning',
        duration: 4000,
      });

      expect(id).toBe('custom-uuid-456');
    });

    it('should include optional title and duration', () => {
      useToastStore.getState().enqueue({
        variant: 'info',
        message: 'Info message',
        title: 'Info Title',
        duration: 5000,
      });

      const state = useToastStore.getState();

      expect(state.queue[0]).toEqual({
        id: 'test-uuid-123',
        variant: 'info',
        message: 'Info message',
        title: 'Info Title',
        duration: 5000,
      });
    });
  });

  describe('dequeue', () => {
    it('should remove toast by ID', () => {
      // Set up queue with multiple toasts
      useToastStore.setState({
        queue: [
          { id: 'toast-1', variant: 'success', message: 'First' },
          { id: 'toast-2', variant: 'error', message: 'Second' },
          { id: 'toast-3', variant: 'info', message: 'Third' },
        ],
      });

      useToastStore.getState().dequeue('toast-2');

      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(2);
      expect(state.queue.find(t => t.id === 'toast-2')).toBeUndefined();
      expect(state.queue[0]?.id).toBe('toast-1');
      expect(state.queue[1]?.id).toBe('toast-3');
    });

    it('should not error when removing non-existent ID', () => {
      useToastStore.setState({
        queue: [
          { id: 'toast-1', variant: 'success', message: 'First' },
        ],
      });

      // Should not throw
      expect(() => {
        useToastStore.getState().dequeue('non-existent-id');
      }).not.toThrow();

      // Queue should remain unchanged
      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]?.id).toBe('toast-1');
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      useToastStore.setState({
        queue: [
          { id: 'toast-1', variant: 'success', message: 'First' },
          { id: 'toast-2', variant: 'error', message: 'Second' },
          { id: 'toast-3', variant: 'info', message: 'Third' },
        ],
      });

      useToastStore.getState().clear();

      const state = useToastStore.getState();

      expect(state.queue).toHaveLength(0);
      expect(state.queue).toEqual([]);
    });

    it('should not error when clearing an already empty queue', () => {
      useToastStore.setState({ queue: [] });

      expect(() => {
        useToastStore.getState().clear();
      }).not.toThrow();

      const state = useToastStore.getState();

      expect(state.queue).toEqual([]);
    });
  });

  describe('convenience functions', () => {
    it('toastSuccess should use 3000ms duration', () => {
      const id = toastSuccess('Success message', 'Success Title');

      const state = useToastStore.getState();

      expect(state.queue[0]).toMatchObject({
        variant: 'success',
        message: 'Success message',
        title: 'Success Title',
        duration: 3000,
      });
      expect(id).toBe('test-uuid-123');
    });

    it('toastError should use 5000ms duration', () => {
      const id = toastError('Error message', 'Error Title');

      const state = useToastStore.getState();

      expect(state.queue[0]).toMatchObject({
        variant: 'error',
        message: 'Error message',
        title: 'Error Title',
        duration: 5000,
      });
      expect(id).toBe('test-uuid-123');
    });

    it('toastWarning should use 5000ms duration', () => {
      const id = toastWarning('Warning message', 'Warning Title');

      const state = useToastStore.getState();

      expect(state.queue[0]).toMatchObject({
        variant: 'warning',
        message: 'Warning message',
        title: 'Warning Title',
        duration: 5000,
      });
      expect(id).toBe('test-uuid-123');
    });

    it('toastInfo should use 3000ms duration', () => {
      const id = toastInfo('Info message', 'Info Title');

      const state = useToastStore.getState();

      expect(state.queue[0]).toMatchObject({
        variant: 'info',
        message: 'Info message',
        title: 'Info Title',
        duration: 3000,
      });
      expect(id).toBe('test-uuid-123');
    });

    it('convenience functions should work without title', () => {
      toastSuccess('Message only');

      const state = useToastStore.getState();

      expect(state.queue[0]?.title).toBeUndefined();
      expect(state.queue[0]?.message).toBe('Message only');
    });
  });
});
