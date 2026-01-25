import { describe, expect, it } from 'vitest';
import { calculateDuration, formatDuration } from './utils';

describe('calculateDuration', () => {
  it('should calculate positive duration correctly', () => {
    const start = new Date('2024-01-01T10:00:00');
    const end = new Date('2024-01-01T10:25:00');

    expect(calculateDuration(start, end)).toBe(25);
  });

  it('should return 0 for same start and end time', () => {
    const time = new Date('2024-01-01T10:00:00');

    expect(calculateDuration(time, time)).toBe(0);
  });

  it('should return negative value when end is before start', () => {
    const start = new Date('2024-01-01T10:25:00');
    const end = new Date('2024-01-01T10:00:00');

    expect(calculateDuration(start, end)).toBe(-25);
  });

  it('should round to nearest minute', () => {
    const start = new Date('2024-01-01T10:00:00');
    const end = new Date('2024-01-01T10:00:40'); // 40 seconds

    expect(calculateDuration(start, end)).toBe(1);
  });
});

describe('formatDuration', () => {
  it('should format 0 minutes correctly', () => {
    expect(formatDuration(0)).toBe('0 min');
  });

  it('should format negative duration as 0 min', () => {
    expect(formatDuration(-10)).toBe('0 min');
  });

  it('should format minutes less than 60', () => {
    expect(formatDuration(25)).toBe('25 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('should format exactly 1 hour', () => {
    expect(formatDuration(60)).toBe('1h 0m');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(125)).toBe('2h 5m');
  });

  it('should format multiple hours', () => {
    expect(formatDuration(180)).toBe('3h 0m');
    expect(formatDuration(195)).toBe('3h 15m');
  });
});
