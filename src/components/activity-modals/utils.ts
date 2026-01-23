/**
 * Calculates the duration in minutes between start and end times
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  const durationMs = endTime.getTime() - startTime.getTime();
  return Math.round(durationMs / (1000 * 60));
}

/**
 * Formats duration in minutes to a human-readable string (e.g., "25 min", "1h 30m")
 */
export function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 0) {
    return '0 min';
  }
  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return `${hours}h ${mins}m`;
}
