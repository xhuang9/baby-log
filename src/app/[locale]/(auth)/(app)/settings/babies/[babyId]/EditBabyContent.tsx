'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { localDb } from '@/lib/local-db/database';
import { getI18nPath } from '@/utils/Helpers';
import { EditBabyForm } from './EditBabyForm';

type EditBabyContentProps = {
  babyId: string;
  locale: string;
};

export function EditBabyContent({ babyId, locale }: EditBabyContentProps) {
  const router = useRouter();
  const numericBabyId = Number.parseInt(babyId, 10);

  // Get current user from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  // Get baby and access info from IndexedDB
  const babyData = useLiveQuery(async () => {
    if (Number.isNaN(numericBabyId)) return null;

    const baby = await localDb.babies.get(numericBabyId);
    if (!baby || baby.archivedAt !== null) return null;

    // Get user's access to this baby
    const user = await localDb.users.toCollection().first();
    if (!user) return null;

    const access = await localDb.babyAccess
      .where('[oduserId+babyId]')
      .equals([user.id, numericBabyId])
      .first();

    if (!access) return null;

    return {
      baby,
      access,
    };
  }, [numericBabyId]);

  // Redirect if no access or viewer-only
  useEffect(() => {
    if (babyData === undefined) return; // Still loading

    if (babyData === null) {
      // No baby or no access - redirect
      router.push(getI18nPath('/settings', locale));
      return;
    }

    if (babyData.access.accessLevel === 'viewer') {
      // Viewers can't edit - redirect
      router.push(getI18nPath('/settings', locale));
    }
  }, [babyData, locale, router]);

  // Loading state
  if (userData === undefined || babyData === undefined) {
    return (
      <div className="mr-auto max-w-2xl space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  // No data (will redirect)
  if (babyData === null) {
    return null;
  }

  const { baby, access } = babyData;

  return (
    <div className="mr-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Edit Baby</h1>
        <p className="text-sm text-muted-foreground">
          Update {baby.name}'s information
        </p>
      </div>

      <EditBabyForm
        babyId={baby.id}
        initialData={{
          name: baby.name,
          birthDate: baby.birthDate,
          gender: baby.gender,
          birthWeightG: baby.birthWeightG,
          caregiverLabel: access.caregiverLabel,
        }}
        redirectPath={getI18nPath('/settings', locale)}
      />
    </div>
  );
}
