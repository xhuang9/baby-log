import type { InputMode } from '@/components/activity-modals';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useSleepFormSubmit } from './useSleepFormSubmit';

// Mock dependencies
vi.mock('@/services/operations', () => ({
  createSleepLog: vi.fn(),
}));

vi.mock('@/components/activity-modals', () => ({
  calculateDuration: vi.fn(),
}));

// Test component wrapper
function TestWrapper({
  options,
  onSubmitClick,
}: {
  options: any;
  onSubmitClick?: () => void;
}) {
  const { handleSubmit, isSubmitting, error } = useSleepFormSubmit(options);

  return (
    <div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="is-submitting">{isSubmitting ? 'true' : 'false'}</div>
      <button
        type="button"
        data-testid="submit"
        onClick={() => {
          handleSubmit();
          onSubmitClick?.();
        }}
      >
        Submit
      </button>
    </div>
  );
}

describe('useSleepFormSubmit', () => {
  const mockPrepareTimerSave = vi.fn();
  const mockCompleteTimerSave = vi.fn();
  const mockResetForm = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  const defaultOptions = {
    babyId: 1,
    inputMode: 'timer' as InputMode,
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    prepareTimerSave: mockPrepareTimerSave,
    completeTimerSave: mockCompleteTimerSave,
    resetForm: mockResetForm,
    onSuccess: mockOnSuccess,
    onClose: mockOnClose,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { createSleepLog } = await import('@/services/operations');
    vi.mocked(createSleepLog).mockResolvedValue({
      success: true,
      data: {
        id: 'sleep-123',
        babyId: 1,
        startedAt: new Date('2024-01-15T10:00:00Z'),
        durationMinutes: 45,
        loggedByUserId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any);
  });

  describe('Timer Mode', () => {
    it('should validate timer is started before saving', async () => {
      mockPrepareTimerSave.mockResolvedValue(null);

      render(<TestWrapper options={defaultOptions} />);

      await page.getByTestId('submit').click();

      await vi.waitFor(async () => {
        const errorEl = await page.getByTestId('error').element();

        expect(errorEl.textContent).toBe(
          'Please start the timer before saving',
        );
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should validate timer duration is positive', async () => {
      mockPrepareTimerSave.mockResolvedValue({
        durationMinutes: 0,
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      render(<TestWrapper options={defaultOptions} />);

      await page.getByTestId('submit').click();

      await vi.waitFor(async () => {
        const errorEl = await page.getByTestId('error').element();

        expect(errorEl.textContent).toBe(
          'Please start the timer before saving',
        );
      });
    });

    it('should save sleep log in timer mode', async () => {
      const { createSleepLog } = await import('@/services/operations');

      mockPrepareTimerSave.mockResolvedValue({
        durationMinutes: 45,
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      render(<TestWrapper options={defaultOptions} />);

      await page.getByTestId('submit').click();

      await vi.waitFor(() => {
        expect(createSleepLog).toHaveBeenCalledWith({
          babyId: 1,
          startedAt: expect.any(Date),
          durationMinutes: 45,
        });
        expect(mockCompleteTimerSave).toHaveBeenCalled();
        expect(mockResetForm).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Manual Mode', () => {
    it('should calculate duration in manual mode', async () => {
      const { createSleepLog } = await import('@/services/operations');
      const { calculateDuration } = await import(
        '@/components/activity-modals',
      );

      vi.mocked(calculateDuration).mockReturnValue(60);

      render(
        <TestWrapper
          options={{
            ...defaultOptions,
            inputMode: 'manual',
          }}
        />,
      );

      await page.getByTestId('submit').click();

      await vi.waitFor(() => {
        expect(calculateDuration).toHaveBeenCalledWith(
          defaultOptions.startTime,
          defaultOptions.endTime,
        );
        expect(createSleepLog).toHaveBeenCalledWith({
          babyId: 1,
          startedAt: defaultOptions.startTime,
          durationMinutes: 60,
        });
        expect(mockCompleteTimerSave).not.toHaveBeenCalled();
        expect(mockResetForm).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should validate end time is after start time', async () => {
      const { calculateDuration } = await import(
        '@/components/activity-modals',
      );

      vi.mocked(calculateDuration).mockReturnValue(-10);

      render(
        <TestWrapper
          options={{
            ...defaultOptions,
            inputMode: 'manual',
          }}
        />,
      );

      await page.getByTestId('submit').click();

      await vi.waitFor(async () => {
        const errorEl = await page.getByTestId('error').element();

        expect(errorEl.textContent).toBe('End time must be after start time');
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const { createSleepLog } = await import('@/services/operations');

      vi.mocked(createSleepLog).mockResolvedValue({
        success: false,
        error: 'Database error',
      } as any);

      mockPrepareTimerSave.mockResolvedValue({
        durationMinutes: 30,
        startTime: new Date(),
      });

      render(<TestWrapper options={defaultOptions} />);

      await page.getByTestId('submit').click();

      await vi.waitFor(async () => {
        const errorEl = await page.getByTestId('error').element();

        expect(errorEl.textContent).toBe('Database error');
      });

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockResetForm).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const { createSleepLog } = await import('@/services/operations');

      vi.mocked(createSleepLog).mockRejectedValue(new Error('Network error'));

      mockPrepareTimerSave.mockResolvedValue({
        durationMinutes: 30,
        startTime: new Date(),
      });

      render(<TestWrapper options={defaultOptions} />);

      await page.getByTestId('submit').click();

      await vi.waitFor(async () => {
        const errorEl = await page.getByTestId('error').element();

        expect(errorEl.textContent).toBe('Network error');
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback if provided', async () => {
      mockPrepareTimerSave.mockResolvedValue({
        durationMinutes: 45,
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      render(<TestWrapper options={defaultOptions} />);

      await page.getByTestId('submit').click();

      await vi.waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should not crash if onSuccess is not provided', async () => {
      mockPrepareTimerSave.mockResolvedValue({
        durationMinutes: 45,
        startTime: new Date('2024-01-15T10:00:00Z'),
      });

      render(
        <TestWrapper
          options={{
            ...defaultOptions,
            onSuccess: undefined,
          }}
        />,
      );

      await page.getByTestId('submit').click();

      await vi.waitFor(() => {
        expect(mockResetForm).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
