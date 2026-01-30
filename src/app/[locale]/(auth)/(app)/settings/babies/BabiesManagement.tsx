'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Baby, Check, ChevronRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import { localDb } from '@/lib/local-db/database';
import { setDefaultBaby } from '@/services/operations';
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
  locale: string;
}) {
  const { locale } = props;

  // Read user and babies from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  const babies = useLiveQuery(async (): Promise<BabyInfo[]> => {
    const accessList = await localDb.babyAccess.toArray();
    const babyIds = accessList.map(a => a.babyId);

    const allBabies = await localDb.babies
      .where('id')
      .anyOf(babyIds)
      .toArray();

    return allBabies
      .filter(b => b.archivedAt === null)
      .map((baby) => {
        const access = accessList.find(a => a.babyId === baby.id);
        return {
          babyId: baby.id,
          name: baby.name,
          birthDate: baby.birthDate,
          gender: baby.gender,
          accessLevel: access?.accessLevel ?? 'viewer',
          caregiverLabel: access?.caregiverLabel ?? null,
          archivedAt: baby.archivedAt,
        };
      })
      .sort((a, b) => {
        const order = { owner: 0, editor: 1, viewer: 2 };
        return order[a.accessLevel] - order[b.accessLevel];
      });
  }, []);

  const currentDefaultId = userData?.defaultBabyId ?? null;
  const router = useRouter();
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoize current and other babies to avoid multiple filter operations
  const { currentBaby, otherBabies } = useMemo(() => {
    const current = babies?.find(b => b.babyId === currentDefaultId) ?? null;
    const others = babies?.filter(b => b.babyId !== currentDefaultId) ?? [];
    return { currentBaby: current, otherBabies: others };
  }, [babies, currentDefaultId]);

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

      // Operation already updated the store, just refresh
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

  // Loading state
  if (userData === undefined || babies === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Current Default Baby */}
      {currentBaby && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Current Default Baby
          </h2>
          <div
            className="rounded-lg border-2 border-primary bg-primary/5 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Baby className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{currentBaby.name}</h3>
                  <Check className="h-4 w-4 text-primary" />
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {formatAge(currentBaby.birthDate) && (
                    <span>{formatAge(currentBaby.birthDate)}</span>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {currentBaby.accessLevel}
                  </span>
                  {currentBaby.caregiverLabel && (
                    <span>
                      Your role:
                      {currentBaby.caregiverLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Babies */}
      {otherBabies.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Other Babies
          </h2>
          <div className="space-y-2">
            {otherBabies.map(baby => (
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
