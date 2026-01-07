'use client';

import { Baby, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setDefaultBaby } from '@/actions/babyActions';
import { useBabyStore } from '@/stores/useBabyStore';

type BabyOption = {
  babyId: number;
  name: string;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: Date | null;
  birthDate: Date | null;
};

export function SelectBabyForm(props: {
  babies: BabyOption[];
  currentDefaultId: number | null;
  redirectPath: string;
}) {
  const { babies, currentDefaultId, redirectPath } = props;
  const router = useRouter();
  const setActiveBaby = useBabyStore(state => state.setActiveBaby);
  const [selectedId, setSelectedId] = useState<number | null>(
    currentDefaultId ?? babies[0]?.babyId ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedId) {
      setError('Please select a baby');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await setDefaultBaby(selectedId);

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Set baby in store
      setActiveBaby(result.baby);

      // Redirect to overview
      router.replace(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select baby');
      setIsSubmitting(false);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {babies.map(baby => (
          <button
            key={baby.babyId}
            type="button"
            onClick={() => setSelectedId(baby.babyId)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              selectedId === baby.babyId
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Baby className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{baby.name}</h3>
                  {selectedId === baby.babyId && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
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

                {baby.lastAccessedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last accessed
                    {' '}
                    {new Date(baby.lastAccessedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !selectedId}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? 'Switching...' : 'Continue to Overview'}
      </button>
    </form>
  );
}
