'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Clock, Copy, Mail, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { regenerateInvite, revokeInvite } from '@/actions/babyActions';
import { localDb } from '@/lib/local-db/database';
import { EmailInviteLinkModal } from './EmailInviteLinkModal';
import { PasskeyCodeModal } from './PasskeyCodeModal';

type PendingInvitesSectionProps = {
  babyId: number;
};

export function PendingInvitesSection({ babyId }: PendingInvitesSectionProps) {
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState<{
    inviteType: 'passkey' | 'email';
    code?: string;
    link?: string;
    expiresAt?: Date;
  } | null>(null);

  // Fetch pending invites from IndexedDB
  const pendingInvites = useLiveQuery(async () => {
    const invites = await localDb.babyInvites
      .where('[babyId+status]')
      .equals([babyId, 'pending'])
      .toArray();

    // Filter out expired invites
    const now = new Date();
    return invites.filter(invite => new Date(invite.expiresAt) > now);
  }, [babyId]);

  const handleCopyEmailLink = async (invite: { token: string; id: number }) => {
    setCopyingId(invite.id);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const inviteLink = `${baseUrl}/account/bootstrap?invite=${invite.token}`;

      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied to clipboard');
    }
    catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link to clipboard');
    }
    finally {
      setCopyingId(null);
    }
  };

  const handleRegenerateInvite = async (inviteId: number) => {
    setRegeneratingId(inviteId);
    setError(null);

    try {
      const result = await regenerateInvite({ inviteId });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      // Show modal with new code/link
      if (result.inviteType === 'passkey') {
        setShowRegenerateModal({
          inviteType: 'passkey',
          code: result.code,
          expiresAt: result.expiresAt,
        });
        toast.success('New code generated');
      }
      else {
        setShowRegenerateModal({
          inviteType: 'email',
          link: result.inviteLink,
          expiresAt: result.expiresAt,
        });
        toast.success('New invite link generated');
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to regenerate invite';
      setError(errorMsg);
      toast.error(errorMsg);
    }
    finally {
      setRegeneratingId(null);
    }
  };

  const handleRevoke = async (inviteId: number) => {
    if (!confirm('Are you sure you want to revoke this invite?')) {
      return;
    }

    setRevokingId(inviteId);
    setError(null);

    try {
      const result = await revokeInvite({ inviteId });

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
      }
      else {
        toast.success('Invite revoked');
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke invite';
      setError(errorMsg);
      toast.error(errorMsg);
    }
    finally {
      setRevokingId(null);
    }
  };

  const handleCloseRegenerateModal = () => {
    setShowRegenerateModal(null);
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (pendingInvites === undefined) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Pending Invites</h2>
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (pendingInvites.length === 0) {
    return null; // Don't show section if no pending invites
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Pending Invites</h2>
        <p className="text-sm text-muted-foreground">
          Active invitations waiting to be accepted
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {pendingInvites.map(invite => (
          <div
            key={invite.id}
            className="flex items-center justify-between rounded-lg border bg-background p-4"
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="rounded-full bg-muted p-2">
                {invite.inviteType === 'passkey' ? (
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Mail className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {invite.inviteType === 'passkey' ? 'Code' : 'Email'}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {invite.accessLevel}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  {invite.inviteType === 'passkey'
                    ? `Code: ${invite.tokenPrefix || '******'}`
                    : invite.invitedEmail}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Expires in {formatTimeRemaining(invite.expiresAt)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Copy Button (email only) */}
              {invite.inviteType === 'email' && (
                <button
                  type="button"
                  onClick={() => handleCopyEmailLink(invite)}
                  disabled={
                    copyingId === invite.id ||
                    regeneratingId === invite.id ||
                    revokingId === invite.id
                  }
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Copy invite link"
                  title="Copy invite link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}

              {/* Regenerate Button (both types) */}
              <button
                type="button"
                onClick={() => handleRegenerateInvite(invite.id)}
                disabled={
                  copyingId === invite.id ||
                  regeneratingId === invite.id ||
                  revokingId === invite.id
                }
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Generate new code/link"
                aria-busy={regeneratingId === invite.id}
                title="Generate new code/link"
              >
                <RefreshCw className={`h-4 w-4 ${regeneratingId === invite.id ? 'animate-spin' : ''}`} />
              </button>

              {/* Revoke Button */}
              <button
                type="button"
                onClick={() => handleRevoke(invite.id)}
                disabled={
                  copyingId === invite.id ||
                  regeneratingId === invite.id ||
                  revokingId === invite.id
                }
                className="rounded-md p-2 text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Revoke invite"
                title="Revoke invite"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Regenerate Modals */}
      {showRegenerateModal?.inviteType === 'passkey' && showRegenerateModal.code && showRegenerateModal.expiresAt && (
        <PasskeyCodeModal
          code={showRegenerateModal.code}
          expiresAt={showRegenerateModal.expiresAt}
          onClose={handleCloseRegenerateModal}
        />
      )}

      {showRegenerateModal?.inviteType === 'email' && showRegenerateModal.link && showRegenerateModal.expiresAt && (
        <EmailInviteLinkModal
          inviteLink={showRegenerateModal.link}
          expiresAt={showRegenerateModal.expiresAt}
          onClose={handleCloseRegenerateModal}
        />
      )}
    </div>
  );
}
