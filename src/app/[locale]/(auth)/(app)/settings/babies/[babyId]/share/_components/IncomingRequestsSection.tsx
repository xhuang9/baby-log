'use client';

import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { approveAccessRequest, listIncomingRequests, rejectAccessRequest } from '@/actions/accessRequestActions';
import type { AccessRequest } from '@/actions/accessRequestActions';

type IncomingRequestsSectionProps = {
  babyId: number;
};

export function IncomingRequestsSection({ babyId }: IncomingRequestsSectionProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const result = await listIncomingRequests();
      if (result.success) {
        setRequests(result.requests);
      }
      else {
        setError(result.error);
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    }
    finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    setError(null);

    try {
      const result = await approveAccessRequest({
        requestId,
        babyId,
        accessLevel: 'editor', // Default to editor
      });

      if (result.success) {
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
      else {
        setError(result.error);
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
    finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!confirm('Are you sure you want to reject this access request?')) {
      return;
    }

    setProcessingId(requestId);
    setError(null);

    try {
      const result = await rejectAccessRequest({ requestId });

      if (result.success) {
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
      else {
        setError(result.error);
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    }
    finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Access Requests</h2>
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show section if no requests
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Access Requests</h2>
        <p className="text-sm text-muted-foreground">
          People requesting access to your baby
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {requests.map(request => (
          <div
            key={request.id}
            className="rounded-lg border bg-background p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {request.requesterName || request.requesterEmail}
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.requesterEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(request.createdAt)}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {request.requestedAccessLevel}
              </span>
            </div>

            {request.message && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground italic">
                  "{request.message}"
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject(request.id)}
                disabled={processingId === request.id}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
