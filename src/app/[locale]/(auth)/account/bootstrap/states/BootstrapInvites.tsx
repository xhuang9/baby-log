'use client';

import type { BootstrapInvite } from '@/types/bootstrap';
import { Check, Mail, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { acceptInvite } from '@/actions/babyActions';
import { useBabyStore } from '@/stores/useBabyStore';

type BootstrapInvitesProps = {
  invites: BootstrapInvite[];
  redirectPath: string;
};

export function BootstrapInvites(props: BootstrapInvitesProps) {
  const { invites, redirectPath } = props;
  const router = useRouter();
  const setActiveBaby = useBabyStore(state => state.setActiveBaby);

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async (invite: BootstrapInvite) => {
    setProcessingId(invite.id);
    setError(null);

    try {
      const result = await acceptInvite(invite.id);

      if (!result.success) {
        setError(result.error);
        setProcessingId(null);
        return;
      }

      // Set baby in store
      setActiveBaby(result.baby);

      // Redirect to overview
      router.replace(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: number) => {
    setProcessingId(inviteId);
    setError(null);

    try {
      // TODO: Implement decline invite action
      // await declineInvite(inviteId);
      setProcessingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite');
      setProcessingId(null);
    }
  };

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Expired';
    }
    if (diffDays === 1) {
      return 'Expires tomorrow';
    }
    if (diffDays < 7) {
      return `Expires in ${diffDays} days`;
    }
    return `Expires ${date.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Baby Invites</h1>
        <p className="text-sm text-muted-foreground">
          You've been invited to help track
          {' '}
          {invites.length === 1 ? 'a baby' : 'babies'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {invites.map(invite => (
          <div
            key={invite.id}
            className="rounded-lg border bg-card p-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{invite.babyName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Invited by
                    {' '}
                    {invite.inviterEmail}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {invite.accessLevel}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {formatExpiry(invite.expiresAt)}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAccept(invite)}
                  disabled={processingId === invite.id}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {processingId === invite.id ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(invite.id)}
                  disabled={processingId === invite.id}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
