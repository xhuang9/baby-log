'use client';

import { UserAvatar, useUser } from '@clerk/nextjs';
import { Baby, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { useBabyStore } from '@/stores/useBabyStore';

export function SettingsContent() {
  const { user } = useUser();
  const activeBaby = useBabyStore(state => state.activeBaby);

  return (
    <div className="mr-auto max-w-2xl space-y-6">
      <div className="space-y-2">
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

        {/* Babies Management Section */}
        <Link
          href="/settings/babies"
          className="flex w-full items-center justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Baby className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Manage Babies</p>
              {activeBaby && (
                <p className="text-sm text-muted-foreground">
                  Current:
                  {activeBaby.name}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Sign Out Button */}
      <div className="pt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
