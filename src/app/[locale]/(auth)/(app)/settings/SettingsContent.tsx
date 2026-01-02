'use client';

import { SignOutButton, useUser } from '@clerk/nextjs';
import { ChevronRight } from 'lucide-react';
import { UserProfileDialog } from '@/components/navigation/UserProfileDialog';

export function SettingsContent() {
  const { user } = useUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your preferences, notifications, and account.
        </p>
      </div>

      <div className="space-y-1">
        {/* Account Section */}
        <UserProfileDialog
          trigger={(
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{user?.fullName || 'Account Name'}</p>
                <p className="text-sm text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          )}
        />
      </div>

      {/* Sign Out Button */}
      <div className="pt-4 text-red-500">
        <SignOutButton>Sign out</SignOutButton>
      </div>
    </div>
  );
}
