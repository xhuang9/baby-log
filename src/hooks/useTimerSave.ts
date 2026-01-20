/**
 * useTimerSave Hook
 *
 * Manages timer state and handles the save flow for activity logging with timers.
 * Automatically pauses running timers, shows confirmation, and resets on save.
 */

import { useTimerStore } from '@/stores/useTimerStore';

type LogType = 'feed' | 'sleep' | 'nappy';

type UseTimerSaveOptions = {
  babyId: number;
  logType: LogType;
};

type TimerSaveResult = {
  confirmed: boolean;
  durationMinutes: number;
  startTime: Date;
};

export function useTimerSave({ babyId, logType }: UseTimerSaveOptions) {
  const timerKey = `${logType}-${babyId}`;

  // Subscribe to timer state
  const timers = useTimerStore(state => state.timers);
  const timerState = timers[timerKey];

  const {
    getTotalElapsed,
    getActualStartTime,
    pauseTimer,
    resetTimer,
    startTimer: resumeTimer,
  } = useTimerStore();

  /**
   * Handles the timer save flow:
   * 1. Pauses timer if running
   * 2. Shows confirmation dialog
   * 3. Resumes timer if user cancels
   * 4. Returns confirmation status and timer data
   */
  const prepareTimerSave = async (): Promise<TimerSaveResult | null> => {
    let wasTimerRunning = false;

    // Check if timer is running and pause it immediately
    if (timerState?.lastStartTime) {
      wasTimerRunning = true;
      await pauseTimer(timerKey);
    }

    // Get timer data
    const totalElapsedSeconds = getTotalElapsed(timerKey);
    const actualStartTime = getActualStartTime(timerKey);

    if (!actualStartTime || totalElapsedSeconds === 0) {
      return null;
    }

    // Use Math.ceil to ensure any elapsed time counts as at least 1 minute
    const durationMinutes = Math.ceil(totalElapsedSeconds / 60);

    if (durationMinutes <= 0) {
      return null;
    }

    // Show confirmation dialog
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `Save ${logType} log with ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}?`,
    );

    if (!confirmed) {
      // If user cancels and timer was running, resume it
      if (wasTimerRunning) {
        await resumeTimer(timerKey, babyId, logType);
      }
      return null;
    }

    return {
      confirmed: true,
      durationMinutes,
      startTime: actualStartTime,
    };
  };

  /**
   * Resets the timer after successful save
   */
  const completeTimerSave = async () => {
    await resetTimer(timerKey);
  };

  return {
    timerState,
    timerKey,
    getTotalElapsed,
    getActualStartTime,
    prepareTimerSave,
    completeTimerSave,
  };
}
