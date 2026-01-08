'use client';

import { Check, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  approveAccessRequest,
  rejectAccessRequest,
} from '@/actions/accessRequestActions';
import { acceptInvite } from '@/actions/babyActions';
import { useBabyStore } from '@/stores/useBabyStore';
import { AccessRequestApprovalDialog } from './AccessRequestApprovalDialog';

type Invite = {
  id: number;
  babyName: string;
  inviterFirstName: string | null;
  inviterEmail: string | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  expiresAt: Date;
};

type AccessRequest = {
  id: number;
  requesterName: string | null;
  requesterEmail: string | null;
  message: string | null;
  requestedAccessLevel: 'owner' | 'editor' | 'viewer';
  createdAt: Date;
};

export function SharedBabyInvites(props: {
  invites: Invite[];
  accessRequests: AccessRequest[];
  redirectPath: string;
}) {
  const { invites, accessRequests, redirectPath } = props;
  const router = useRouter();
  const setActiveBaby = useBabyStore(state => state.setActiveBaby);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(() => new Set());
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [processedRequestIds, setProcessedRequestIds] = useState<Set<number>>(() => new Set());

  // Auto-open dialog for first access request if any exist
  useEffect(() => {
    if (accessRequests.length > 0 && !selectedRequest) {
      setSelectedRequest(accessRequests[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = async (inviteId: number) => {
    setAcceptingId(inviteId);
    setError(null);

    try {
      const result = await acceptInvite(inviteId);

      if (!result.success) {
        setError(result.error);
        setAcceptingId(null);
        return;
      }

      // Mark as accepted
      setAcceptedIds(prev => new Set(prev).add(inviteId));

      // Set baby in store
      setActiveBaby(result.baby);

      // Redirect to overview after a brief delay
      setTimeout(() => {
        router.replace(redirectPath);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setAcceptingId(null);
    }
  };

  const handleApproveRequest = async (babyId: number, accessLevel: 'owner' | 'editor' | 'viewer') => {
    if (!selectedRequest) {
      return;
    }

    setError(null);

    try {
      const result = await approveAccessRequest({
        requestId: selectedRequest.id,
        babyId,
        accessLevel,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Mark as processed
      setProcessedRequestIds(prev => new Set(prev).add(selectedRequest.id));
      setSelectedRequest(null);

      // Reload page to refresh lists
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) {
      return;
    }

    setError(null);

    try {
      const result = await rejectAccessRequest({
        requestId: selectedRequest.id,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Mark as processed
      setProcessedRequestIds(prev => new Set(prev).add(selectedRequest.id));
      setSelectedRequest(null);

      // Reload page to refresh lists
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  const handleSkip = () => {
    router.replace(redirectPath);
  };

  const pendingRequests = accessRequests.filter(r => !processedRequestIds.has(r.id));

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Access Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Access Requests</h2>
          {pendingRequests.map(request => (
            <div
              key={request.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold">
                      {request.requesterName || request.requesterEmail || 'Unknown'}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Requesting
                    {' '}
                    {request.requestedAccessLevel}
                    {' '}
                    access
                  </p>
                  {request.message && (
                    <p className="text-sm text-muted-foreground italic">
                      "
                      {request.message}
                      "
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Sent on
                    {' '}
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(request)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invites Section */}
      {invites.length > 0 && (
        <div className="space-y-4">
          {pendingRequests.length > 0 && <h2 className="text-lg font-semibold">Baby Invites</h2>}
          {invites.map(invite => (
            <div
              key={invite.id}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{invite.babyName}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invited by
                    {' '}
                    {invite.inviterFirstName || invite.inviterEmail || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {invite.accessLevel}
                    </span>
                    <span>
                      Expires
                      {' '}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {acceptedIds.has(invite.id)
                    ? (
                        <div className="flex items-center gap-2 rounded-md bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Accepted
                        </div>
                      )
                    : (
                        <button
                          type="button"
                          onClick={() => handleAccept(invite.id)}
                          disabled={acceptingId !== null}
                          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {acceptingId === invite.id ? 'Accepting...' : 'Accept'}
                        </button>
                      )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center border-t pt-4">
        <button
          type="button"
          onClick={handleSkip}
          disabled={acceptingId !== null}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Skip for now
        </button>
      </div>

      {/* Access Request Approval Dialog */}
      {selectedRequest && (
        <AccessRequestApprovalDialog
          request={selectedRequest}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
