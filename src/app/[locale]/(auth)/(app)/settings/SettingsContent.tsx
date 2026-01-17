'use client';

import { UserAvatar, useUser } from '@clerk/nextjs';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { OfflineLink as Link } from '@/components/ui/offline-link';
import { localDb } from '@/lib/local-db/database';
import { AmountSliderSettings } from './AmountSliderSettings';
import { BabiesList } from './BabiesList';
import { HandPreferenceSetting } from './HandPreferenceSetting';
import { ThemeSetting } from './ThemeSetting';
import { TimeSwiperSettings } from './TimeSwiperSettings';

type BabyInfo = {
  babyId: number;
  name: string;
  birthDate: Date | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  archivedAt: Date | null;
};

export function SettingsContent(props: {
  locale: string;
}) {
  const { locale } = props;
  const { user } = useUser();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAmountSlider, setShowAmountSlider] = useState(false);

  // Read babies from IndexedDB
  const babies = useLiveQuery(async (): Promise<BabyInfo[]> => {
    const accessList = await localDb.babyAccess.toArray();
    const babyIds = accessList.map(a => a.babyId);

    const allBabies = await localDb.babies
      .where('id')
      .anyOf(babyIds)
      .toArray();

    // Filter out archived babies and join with access info
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
      // Sort by access level (owners first)
      .sort((a, b) => {
        const order = { owner: 0, editor: 1, viewer: 2 };
        return order[a.accessLevel] - order[b.accessLevel];
      });
  }, []);

  // Loading state
  if (babies === undefined) {
    return (
      <div className="mx-auto max-w-xl min-w-80 space-y-6 px-4 pb-20">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl min-w-80 space-y-6 px-4 pb-20">
      {/* Babies Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Children
        </h2>
        <BabiesList babies={babies ?? []} locale={locale} />
      </section>

      {/* Preferences Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Preferences
        </h2>
        <div className="divide-y rounded-lg border bg-background">
          <div className="p-4">
            <ThemeSetting />
          </div>
          <div className="p-4">
            <HandPreferenceSetting isCompact />
          </div>
        </div>
      </section>

      {/* Input Controls Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Input Controls
        </h2>
        <div className="divide-y rounded-lg border bg-background">
          {/* Time Picker Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowTimePicker(!showTimePicker)}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <span>Time Picker</span>
              {showTimePicker
                ? <ChevronUp className="size-4 text-muted-foreground" />
                : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {showTimePicker && (
              <div className="border-t p-4">
                <TimeSwiperSettings />
              </div>
            )}
          </div>

          {/* Amount Slider Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowAmountSlider(!showAmountSlider)}
              className="flex w-full items-center justify-between p-4 text-left text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <span>Amount Slider</span>
              {showAmountSlider
                ? <ChevronUp className="size-4 text-muted-foreground" />
                : <ChevronDown className="size-4 text-muted-foreground" />}
            </button>
            {showAmountSlider && (
              <div className="border-t p-4">
                <AmountSliderSettings />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          About
        </h2>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Version</p>
            <p className="text-sm text-muted-foreground">1.0.0</p>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Account
        </h2>
        <div className="overflow-hidden rounded-lg border bg-background">
          <Link
            href="/settings/user-profile"
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center">
              <UserAvatar />
              <div className="ml-4">
                <p className="text-sm font-medium">{user?.fullName || 'Account Name'}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
          <div className="border-t px-4 py-3">
            <SignOutButton />
          </div>
        </div>
      </section>
    </div>
  );
}
