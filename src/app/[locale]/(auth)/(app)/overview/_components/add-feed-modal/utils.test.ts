import { describe, expect, it } from 'vitest';
import { getBreastFeedStartTime, getDefaultEndTime } from './utils';

describe('getDefaultEndTime', () => {
  it('should return a time 15 minutes in the future', () => {
    const now = new Date();
    const result = getDefaultEndTime();
    const diffMinutes = Math.round((result.getTime() - now.getTime()) / (1000 * 60));
    expect(diffMinutes).toBe(15);
  });
});

describe('getBreastFeedStartTime', () => {
  it('should return a time 20 minutes in the past', () => {
    const now = new Date();
    const result = getBreastFeedStartTime();
    const diffMinutes = Math.round((now.getTime() - result.getTime()) / (1000 * 60));
    expect(diffMinutes).toBe(20);
  });
});
