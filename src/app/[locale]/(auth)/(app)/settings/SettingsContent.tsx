'use client';

import { UserAvatar, useUser } from '@clerk/nextjs';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { BabiesList } from './BabiesList';
import { HandPreferenceSetting } from './HandPreferenceSetting';

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
    <div className="mx-auto max-w-2xl min-w-80 space-y-6">
      {/* Account Section */}
      <Link
        href="/settings/user-profile"
        className="flex w-full items-center justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50"
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

      {/* Babies List Section */}
      <BabiesList babies={babies} locale={locale} />

      {/* Preferences Section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Preferences</h2>
        <HandPreferenceSetting />
      </div>

      {/* Sign Out Button */}
      <div className="rounded-lg border bg-background p-4">
        <SignOutButton />
      </div>
    </div>
  );
}
