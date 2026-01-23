// Re-export shared utilities for convenience
export { calculateDuration, formatDuration } from '@/components/activity-modals';

/**
 * Returns a default end time that is 15 minutes after the current time
 */
export function getDefaultEndTime(): Date {
  const end = new Date();
  end.setMinutes(end.getMinutes() + 15);
  return end;
}

/**
 * Returns a start time that is 20 minutes in the past
 */
export function getBreastFeedStartTime(): Date {
  const twentyMinutesAgo = new Date();
  twentyMinutesAgo.setMinutes(twentyMinutesAgo.getMinutes() - 20);
  return twentyMinutesAgo;
}
