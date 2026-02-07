'use client';

import type { BirthDateCalculation } from '../utils';

type BirthDateInfoProps = {
  birthDateInfo: BirthDateCalculation | null;
};

export function BirthDateInfo({ birthDateInfo }: BirthDateInfoProps) {
  // Only show text when using fallback (registration date)
  if (!birthDateInfo || birthDateInfo.source === 'birthDate') {
    return null;
  }

  // Format date as "Month D, YYYY" (e.g., "March 15, 2024")
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(birthDateInfo.birthDate);

  // Show message only for registration date fallback
  return (
    <div className="text-sm text-muted-foreground">
      Calculating your baby&apos;s growth based on registration date:
      {' '}
      {formattedDate}
      {' '}
      <span className="text-xs">(birth date not provided)</span>
    </div>
  );
}
