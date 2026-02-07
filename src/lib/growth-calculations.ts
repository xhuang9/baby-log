/**
 * Growth Chart Calculation Utilities
 *
 * Shared utilities for calculating age and percentiles based on WHO data.
 */

/**
 * Calculate age in months from birth date to measurement date
 * Returns decimal months for precise calculations
 *
 * @param birthDate - Baby's birth date
 * @param measurementDate - Date of measurement
 * @returns Age in decimal months
 */
export function calculateAgeInMonths(
  birthDate: Date,
  measurementDate: Date,
): number {
  const diffMs = measurementDate.getTime() - birthDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays / 30.4375; // Average days in a month (365.25 / 12)
}
