/**
 * Birth Date Calculation Utility
 *
 * Determines which date to use for growth chart calculations:
 * - Primary: baby's birth date
 * - Fallback: user's registration date
 */

import type { LocalBaby } from '@/lib/local-db';

export type BirthDateCalculation = {
  birthDate: Date;
  isFallback: boolean;
  source: 'birthDate' | 'registration';
};

/**
 * Get birth date for growth chart calculations with fallback logic
 *
 * @param baby - Baby data with optional birth date
 * @param userCreatedAt - User registration date (fallback)
 * @returns Birth date calculation object or null if no date available
 */
export function getBirthDateForCalculation(
  baby: LocalBaby | null | undefined,
  userCreatedAt: Date | null | undefined,
): BirthDateCalculation | null {
  // Primary: Use baby's birth date if available
  if (baby?.birthDate) {
    return {
      birthDate: new Date(baby.birthDate),
      isFallback: false,
      source: 'birthDate',
    };
  }

  // Fallback: Use user's registration date
  if (userCreatedAt) {
    return {
      birthDate: new Date(userCreatedAt),
      isFallback: true,
      source: 'registration',
    };
  }

  // No date available
  return null;
}
