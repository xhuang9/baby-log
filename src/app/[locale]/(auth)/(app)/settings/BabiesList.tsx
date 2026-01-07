'use client';

import { Baby, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { getI18nPath } from '@/utils/Helpers';

type BabyInfo = {
  babyId: number;
  name: string;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  archivedAt: Date | null;
};

export function BabiesList(props: {
  babies: BabyInfo[];
  locale: string;
}) {
  const { babies, locale } = props;

  const formatAge = (birthDate: Date | null) => {
    if (!birthDate) {
      return null;
    }

    const now = new Date();
    const birth = new Date(birthDate);
    const months = Math.floor(
      (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
    );

    if (months < 1) {
      return 'Less than 1 month';
    }
    if (months === 1) {
      return '1 month old';
    }
    if (months < 12) {
      return `${months} months old`;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'} old`;
    }

    return `${years}y ${remainingMonths}m old`;
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Children</h2>

      {/* Babies List */}
      <div className="space-y-2">
        {babies.map(baby => (
          <Link
            key={baby.babyId}
            href={getI18nPath(`/settings/babies/${baby.babyId}`, locale)}
            className="flex w-full items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50"
          >
            {/* Baby Avatar */}
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-lg font-semibold text-white">
              {getInitial(baby.name)}
            </div>

            {/* Baby Info */}
            <div className="flex-1">
              <p className="font-medium">{baby.name}</p>
              {formatAge(baby.birthDate) && (
                <p className="text-sm text-muted-foreground">
                  {formatAge(baby.birthDate)}
                </p>
              )}
            </div>

            {/* Chevron */}
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Add Child Button */}
      <Link
        href={getI18nPath('/settings/babies/new', locale)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed bg-background py-4 text-center transition-colors hover:bg-muted/50"
      >
        <Plus className="size-5 text-primary" />
        <span className="font-medium text-primary">Add Child</span>
      </Link>
    </div>
  );
}
