import { SignOutButton } from '@clerk/nextjs';
import { AlertCircle } from 'lucide-react';

export default function AccountLockedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Locked</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been locked. Please contact support for assistance.
          </p>
        </div>

        <div className="pt-4">
          <SignOutButton>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
