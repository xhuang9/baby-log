'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { SidebarMenuButton } from '@/components/ui-custom/sidebar';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import { localDb } from '@/lib/local-db/database';
import { setDefaultBaby } from '@/services/operations';
import { useBabyStore } from '@/stores/useBabyStore';
import { getI18nPath } from '@/utils/Helpers';

type BabySwitcherProps = {
  locale: string;
};

export const BabySwitcher = ({ locale }: BabySwitcherProps) => {
  const router = useRouter();
  const activeBaby = useBabyStore(state => state.activeBaby);
  const isHydrated = useBabyStore(state => state.isHydrated);
  const hydrate = useBabyStore(state => state.hydrate);
  const setAllBabies = useBabyStore(state => state.setAllBabies);
  const [isPending, startTransition] = useTransition();

  // Read babies from IndexedDB
  const babiesFromDb = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    if (!user) {
      return [];
    }

    const accessList = await localDb.babyAccess.toArray();
    const babyIds = accessList.map(a => a.babyId);

    const babies = await localDb.babies
      .where('id')
      .anyOf(babyIds)
      .toArray();

    return babies
      .filter(b => b.archivedAt === null)
      .map((baby) => {
        const access = accessList.find(a => a.babyId === baby.id);
        return {
          babyId: baby.id,
          name: baby.name,
          birthDate: baby.birthDate,
          accessLevel: access?.accessLevel ?? 'viewer' as const,
          caregiverLabel: access?.caregiverLabel ?? null,
        };
      })
      .sort((a, b) => {
        const order = { owner: 0, editor: 1, viewer: 2 };
        return order[a.accessLevel] - order[b.accessLevel];
      });
  }, []);

  const allBabies = babiesFromDb ?? [];

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  // Sync babies to store when loaded from IndexedDB
  useEffect(() => {
    if (babiesFromDb && babiesFromDb.length > 0) {
      setAllBabies(babiesFromDb);
    }
  }, [babiesFromDb, setAllBabies]);

  const displayName = activeBaby?.name || 'Baby Log';
  const displayInitials = displayName.trim().slice(0, 2).toUpperCase();
  const truncatedName = displayName.length > 10 ? `${displayName.slice(0, 10)}...` : displayName;
  const hasMultipleBabies = allBabies.length > 1;

  const handleCycleBaby = () => {
    if (!activeBaby || allBabies.length <= 1) {
      return;
    }

    const currentIndex = allBabies.findIndex(b => b.babyId === activeBaby.babyId);
    const nextIndex = (currentIndex + 1) % allBabies.length;
    const nextBaby = allBabies[nextIndex];

    if (!nextBaby) {
      return;
    }

    startTransition(async () => {
      const result = await setDefaultBaby(nextBaby.babyId);
      if (result.success) {
        // Operation already updated the store, just refresh
        router.refresh();
      }
    });
  };

  return hasMultipleBabies
    ? (
        <SidebarMenuButton
          size="lg"
          className="p-0"
          onClick={handleCycleBaby}
          disabled={isPending}
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-semibold">
              {displayInitials}
            </span>
          </div>
          <div className="flex flex-1 items-center gap-2 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{truncatedName}</span>
            <ChevronDown className={`size-4 shrink-0 ${isPending ? 'animate-pulse' : ''}`} />
          </div>
        </SidebarMenuButton>
      )
    : (
        <SidebarMenuButton
          size="lg"
          className="p-0"
          render={buttonProps => (
            <Link href={getI18nPath('/overview', locale)} {...buttonProps}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-sm font-semibold">
                  {displayInitials}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{truncatedName}</span>
              </div>
            </Link>
          )}
        />
      );
};
