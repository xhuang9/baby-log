'use client';

import { Baby, Check, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setDefaultBaby } from '@/actions/babyActions';
import { useBabyStore } from '@/stores/useBabyStore';
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

export function BabiesManagement(props: {
  babies: BabyInfo[];
  currentDefaultId: number | null;
  locale: string;
}) {
  const { babies, currentDefaultId, locale } = props;
  const router = useRouter();
  const setActiveBaby = useBabyStore(state => state.setActiveBaby);
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSwitchBaby = async (babyId: number) => {
    setSwitchingTo(babyId);
    setError(null);

    try {
      const result = await setDefaultBaby(babyId);

      if (!result.success) {
        setError(result.error);
        setSwitchingTo(null);
        return;
      }

      // Set baby in store
      setActiveBaby(result.baby);

      // Refresh the page
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch baby');
      setSwitchingTo(null);
    }
  };

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

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Current Default Baby */}
      {currentDefaultId && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Current Default Baby
          </h2>
          {babies
            .filter(b => b.babyId === currentDefaultId)
            .map(baby => (
              <div
                key={baby.babyId}
                className="rounded-lg border-2 border-primary bg-primary/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Baby className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{baby.name}</h3>
                      <Check className="h-4 w-4 text-primary" />
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {formatAge(baby.birthDate) && (
                        <span>{formatAge(baby.birthDate)}</span>
                      )}
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {baby.accessLevel}
                      </span>
                      {baby.caregiverLabel && (
                        <span>
                          Your role:
                          {baby.caregiverLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Other Babies */}
      {babies.filter(b => b.babyId !== currentDefaultId).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Other Babies
          </h2>
          <div className="space-y-2">
            {babies
              .filter(b => b.babyId !== currentDefaultId)
              .map(baby => (
                <div
                  key={baby.babyId}
                  className="rounded-lg border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <Baby className="h-5 w-5" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold">{baby.name}</h3>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {formatAge(baby.birthDate) && (
                          <span>{formatAge(baby.birthDate)}</span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5">
                          {baby.accessLevel}
                        </span>
                        {baby.caregiverLabel && (
                          <span>
                            Your role:
                            {baby.caregiverLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSwitchBaby(baby.babyId)}
                      disabled={switchingTo !== null}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {switchingTo === baby.babyId
                        ? 'Switching...'
                        : 'Switch'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add New Baby Button */}
      <Link
        href={getI18nPath('/settings/babies/new', locale)}
        className="flex w-full items-center justify-between rounded-lg border border-dashed bg-background p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Add Another Baby</p>
            <p className="text-sm text-muted-foreground">
              Track multiple babies
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
