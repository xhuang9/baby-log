'use client';

import { UserAvatar, useUser } from '@clerk/nextjs';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
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
  babies: BabyInfo[];
  locale: string;
}) {
  const { babies, locale } = props;
  const { user } = useUser();

  return (
    <div className="mx-auto max-w-xl min-w-80 space-y-6 px-4 pb-20">
      {/* Babies Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Children
        </h2>
        <BabiesList babies={babies} locale={locale} />
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

      {/* Time Picker Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Time Picker
        </h2>
        <div className="rounded-lg border bg-background p-4">
          <TimeSwiperSettings />
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
