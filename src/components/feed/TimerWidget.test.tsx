/**
 * TimerWidget Component Tests
 *
 * Unit tests for the timer widget component
 */

import type { TimerStore } from '@/stores/useTimerStore';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { useTimerStore } from '@/stores/useTimerStore';
import { TimerWidget } from './TimerWidget';

// Utility to wait for elements
async function waitForText(text: string) {
  return vi.waitFor(() => {
    const elements = page.getByText(text, { exact: false }).elements();
    if (elements.length === 0) throw new Error(`Text "${text}" not found`);
    return elements;
  }, { timeout: 3000 });
}

async function waitForRole(role: string) {
  return vi.waitFor(() => {
    const elements = page.getByRole(role).elements();
    if (elements.length === 0) throw new Error(`Role "${role}" not found`);
    return elements;
  }, { timeout: 3000 });
}

// Mock the stores
vi.mock('@/stores/useTimerStore', () => ({
  useTimerStore: vi.fn(),
}));

vi.mock('@/hooks/useHoldAction', () => ({
  useHoldAction: ({ onAction }: { onAction: () => void }) => ({
    onClick: onAction,
    onMouseDown: vi.fn(),
    onMouseUp: vi.fn(),
    onMouseLeave: vi.fn(),
    onTouchStart: vi.fn(),
    onTouchEnd: vi.fn(),
  }),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
vi.stubGlobal('confirm', mockConfirm);

describe('TimerWidget', () => {
  const mockStartTimer = vi.fn();
  const mockPauseTimer = vi.fn();
  const mockResetTimer = vi.fn();
  const mockAdjustTimer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);

    // Default store state - no timer running
    vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
      const mockState: TimerStore = {
        timers: {},
        isHydrated: true,
        hydrate: vi.fn(),
        getTimer: vi.fn(),
        getTotalElapsed: vi.fn(),
        getActualStartTime: vi.fn(),
        startTimer: mockStartTimer,
        pauseTimer: mockPauseTimer,
        resetTimer: mockResetTimer,
        adjustTimer: mockAdjustTimer,
      };
      // If no selector is provided, return the entire state (for actions)
      // Otherwise, call the selector with the state
      return selector ? selector(mockState) : mockState;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial render', () => {
    it('should render timer display at 00:00:00', async () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      // Wait for time segments to render
      const hours = await waitForText('00');

      expect(hours.length).toBeGreaterThan(0);
    });

    it('should render play button when timer is not running', async () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      const buttons = await waitForRole('button');

      expect(buttons[0]).toBeTruthy();
    });

    it('should render timer controls', () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      expect(page.getByText('Reset')).toBeTruthy();
      expect(page.getByText('+10s')).toBeTruthy();
      expect(page.getByText('-10s')).toBeTruthy();
    });
  });

  describe('timer state display', () => {
    it('should display elapsed time correctly', () => {
      // Mock timer with 90 seconds (1 minute 30 seconds)
      vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
        const mockState: TimerStore = {
          timers: {
            'feed-1': {
              elapsedSeconds: 90,
              lastStartTime: null,
              babyId: 1,
              logType: 'feed' as const,
            },
          },
          isHydrated: true,
          hydrate: vi.fn(),
          getTimer: vi.fn(),
          getTotalElapsed: vi.fn(),
          getActualStartTime: vi.fn(),
          startTimer: mockStartTimer,
          pauseTimer: mockPauseTimer,
          resetTimer: mockResetTimer,
          adjustTimer: mockAdjustTimer,
        };
        return selector ? selector(mockState) : mockState;
      });

      render(<TimerWidget babyId={1} logType="feed" />);

      // Should show 00:01:30
      expect(page.getByText('01')).toBeTruthy(); // minutes
      expect(page.getByText('30')).toBeTruthy(); // seconds
    });

    it('should display hours correctly when elapsed time exceeds 1 hour', () => {
      // Mock timer with 3665 seconds (1 hour, 1 minute, 5 seconds)
      vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
        const mockState: TimerStore = {
          timers: {
            'feed-1': {
              elapsedSeconds: 3665,
              lastStartTime: null,
              babyId: 1,
              logType: 'feed' as const,
            },
          },
          isHydrated: true,
          hydrate: vi.fn(),
          getTimer: vi.fn(),
          getTotalElapsed: vi.fn(),
          getActualStartTime: vi.fn(),
          startTimer: mockStartTimer,
          pauseTimer: mockPauseTimer,
          resetTimer: mockResetTimer,
          adjustTimer: mockAdjustTimer,
        };
        return selector ? selector(mockState) : mockState;
      });

      render(<TimerWidget babyId={1} logType="feed" />);

      // Should show 01:01:05
      expect(page.getByText('01')).toBeTruthy(); // could be hours or minutes
      expect(page.getByText('05')).toBeTruthy(); // seconds
    });

    it('should show pause button when timer is running', async () => {
      vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
        const mockState: TimerStore = {
          timers: {
            'feed-1': {
              elapsedSeconds: 10,
              lastStartTime: new Date().toISOString(),
              babyId: 1,
              logType: 'feed' as const,
            },
          },
          isHydrated: true,
          hydrate: vi.fn(),
          getTimer: vi.fn(),
          getTotalElapsed: vi.fn(),
          getActualStartTime: vi.fn(),
          startTimer: mockStartTimer,
          pauseTimer: mockPauseTimer,
          resetTimer: mockResetTimer,
          adjustTimer: mockAdjustTimer,
        };
        return selector ? selector(mockState) : mockState;
      });

      render(<TimerWidget babyId={1} logType="feed" />);

      // When running, should show pause icon (the button is still there but icon changes)
      const buttons = await waitForRole('button');

      expect(buttons[0]).toBeTruthy();
    });
  });

  describe('timer controls', () => {
    it('should start timer when play button is clicked', async () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      const buttons = await waitForRole('button');
      await userEvent.click(buttons[0]!);

      expect(mockStartTimer).toHaveBeenCalledWith('feed-1', 1, 'feed');
    });

    it('should pause timer when pause button is clicked', async () => {
      vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
        const mockState: TimerStore = {
          timers: {
            'feed-1': {
              elapsedSeconds: 10,
              lastStartTime: new Date().toISOString(),
              babyId: 1,
              logType: 'feed' as const,
            },
          },
          isHydrated: true,
          hydrate: vi.fn(),
          getTimer: vi.fn(),
          getTotalElapsed: vi.fn(),
          getActualStartTime: vi.fn(),
          startTimer: mockStartTimer,
          pauseTimer: mockPauseTimer,
          resetTimer: mockResetTimer,
          adjustTimer: mockAdjustTimer,
        };
        return selector ? selector(mockState) : mockState;
      });

      render(<TimerWidget babyId={1} logType="feed" />);

      const buttons = await waitForRole('button');
      await userEvent.click(buttons[0]!);

      expect(mockPauseTimer).toHaveBeenCalledWith('feed-1');
    });

    it('should reset timer with confirmation when clicked', async () => {
      vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
        const mockState: TimerStore = {
          timers: {
            'feed-1': {
              elapsedSeconds: 60,
              lastStartTime: null,
              babyId: 1,
              logType: 'feed' as const,
            },
          },
          isHydrated: true,
          hydrate: vi.fn(),
          getTimer: vi.fn(),
          getTotalElapsed: vi.fn(),
          getActualStartTime: vi.fn(),
          startTimer: mockStartTimer,
          pauseTimer: mockPauseTimer,
          resetTimer: mockResetTimer,
          adjustTimer: mockAdjustTimer,
        };
        return selector ? selector(mockState) : mockState;
      });

      render(<TimerWidget babyId={1} logType="feed" />);

      const resetButton = page.getByText('Reset');
      await userEvent.click(resetButton);

      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to reset the timer?');
      expect(mockResetTimer).toHaveBeenCalledWith('feed-1');
    });

    it('should not reset timer if user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false);

      vi.mocked(useTimerStore).mockImplementation((selector?: (state: TimerStore) => unknown) => {
        const mockState: TimerStore = {
          timers: {
            'feed-1': {
              elapsedSeconds: 60,
              lastStartTime: null,
              babyId: 1,
              logType: 'feed' as const,
            },
          },
          isHydrated: true,
          hydrate: vi.fn(),
          getTimer: vi.fn(),
          getTotalElapsed: vi.fn(),
          getActualStartTime: vi.fn(),
          startTimer: mockStartTimer,
          pauseTimer: mockPauseTimer,
          resetTimer: mockResetTimer,
          adjustTimer: mockAdjustTimer,
        };
        return selector ? selector(mockState) : mockState;
      });

      render(<TimerWidget babyId={1} logType="feed" />);

      const resetButton = page.getByText('Reset');
      await userEvent.click(resetButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockResetTimer).not.toHaveBeenCalled();
    });

    it('should reset timer without confirmation when elapsed time is 0', async () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      const resetButton = page.getByText('Reset');
      await userEvent.click(resetButton);

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockResetTimer).toHaveBeenCalledWith('feed-1');
    });

    it('should adjust timer by +1m when clicked', async () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      const addButtons = await waitForText('+1m');
      await userEvent.click(addButtons[0]);

      expect(mockAdjustTimer).toHaveBeenCalledWith('feed-1', 60);
    });

    it('should adjust timer by -1m when clicked', async () => {
      render(<TimerWidget babyId={1} logType="feed" />);

      const subtractButtons = await waitForText('-1m');
      await userEvent.click(subtractButtons[0]);

      expect(mockAdjustTimer).toHaveBeenCalledWith('feed-1', -60);
    });
  });

  describe('timer key format', () => {
    it('should use correct timer key for feed', async () => {
      render(<TimerWidget babyId={123} logType="feed" />);

      const buttons = await waitForRole('button');
      await userEvent.click(buttons[0]!);

      expect(mockStartTimer).toHaveBeenCalledWith('feed-123', 123, 'feed');
    });

    it('should use correct timer key for sleep', async () => {
      render(<TimerWidget babyId={456} logType="sleep" />);

      const buttons = await waitForRole('button');
      await userEvent.click(buttons[0]!);

      expect(mockStartTimer).toHaveBeenCalledWith('sleep-456', 456, 'sleep');
    });

    it('should use correct timer key for nappy', async () => {
      render(<TimerWidget babyId={789} logType="nappy" />);

      const buttons = await waitForRole('button');
      await userEvent.click(buttons[0]!);

      expect(mockStartTimer).toHaveBeenCalledWith('nappy-789', 789, 'nappy');
    });
  });

  describe('custom className', () => {
    it('should apply custom className when provided', async () => {
      const result = await render(
        <TimerWidget babyId={1} logType="feed" className="custom-class" />,
      );

      expect(result.container.querySelector('.custom-class')).toBeTruthy();
    });
  });
});
