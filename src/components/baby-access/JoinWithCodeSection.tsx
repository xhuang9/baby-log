'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { acceptInviteByCode } from '@/actions/babyActions';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useBabyStore } from '@/stores/useBabyStore';

type JoinWithCodeSectionProps = {
  redirectPath: string;
  onSuccess?: () => void;
};

export function JoinWithCodeSection({ redirectPath, onSuccess }: JoinWithCodeSectionProps) {
  const router = useRouter();
  const { setActiveBaby } = useBabyStore();

  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    setJoinCodeError(null);

    // Validate length
    if (joinCode.length !== 6) {
      setJoinCodeError('Code must be exactly 6 digits');
      setIsJoining(false);
      return;
    }

    try {
      const result = await acceptInviteByCode({ code: joinCode });

      if (!result.success) {
        setJoinCodeError(result.error);
        setIsJoining(false);
        return;
      }

      // Update the store with the new baby
      setActiveBaby(result.baby);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to bootstrap or provided path to sync data
      // Use replace to avoid going back to join form
      router.replace(redirectPath);
    } catch (err) {
      setJoinCodeError(err instanceof Error ? err.message : 'Failed to join with code');
      setIsJoining(false);
    }
  };

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setShowJoinCode(!showJoinCode)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50"
      >
        <span>Have a caregiver code?</span>
        {showJoinCode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showJoinCode && (
        <div className="border-t p-4">
          <form onSubmit={handleJoinCode} className="space-y-4">
            {joinCodeError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {joinCodeError}
              </div>
            )}

            <div>
              <label htmlFor="joinCode" className="block text-sm font-medium mb-3">
                6-Digit Code
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={joinCode}
                  onChange={value => setJoinCode(value)}
                  disabled={isJoining}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Enter the 6-digit code shared by the baby's caregiver
              </p>
            </div>

            <button
              type="submit"
              disabled={isJoining || joinCode.length !== 6}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Join with Code'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
