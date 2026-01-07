'use client';

import { UserAvatar, useUser } from '@clerk/nextjs';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { BabiesList } from './BabiesList';

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
    <div className="mr-auto max-w-2xl space-y-6">
      {/* Account Section */}
      <Link
        href="/settings/user-profile"
        className="flex w-full items-center justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center">
          <UserAvatar />
          <div className="ml-4">
            <p className="font-medium">{user?.fullName || 'Account Name'}</p>
            <p className="text-sm text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>

      {/* Babies List Section */}
      <BabiesList babies={babies} locale={locale} />

      {/* Sign Out Button */}
      <div className="pt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
