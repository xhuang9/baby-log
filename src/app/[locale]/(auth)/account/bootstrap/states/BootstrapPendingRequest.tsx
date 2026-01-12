'use client';

import type { BootstrapPendingRequest as PendingRequestType } from '@/types/bootstrap';
import { Clock, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

type BootstrapPendingRequestProps = {
  request: PendingRequestType;
  onRetry: () => void;
};

export function BootstrapPendingRequest(props: BootstrapPendingRequestProps) {
  const { request, onRetry } = props;
  const [isCanceling, setIsCanceling] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      // TODO: Implement cancel request action
      // await cancelAccessRequest(request.id);
      onRetry(); // Refresh state
    } catch (error) {
      console.error('Failed to cancel request:', error);
      setIsCanceling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
            <Clock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Access Request Pending</h1>
        <p className="text-sm text-muted-foreground">
          Your request to access baby data is awaiting approval
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Requested from</span>
            <span className="text-sm font-medium">{request.targetEmail}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Requested on</span>
            <span className="text-sm font-medium">{formatDate(request.createdAt)}</span>
          </div>
          {request.message && (
            <div className="border-t pt-3">
              <span className="text-sm text-muted-foreground">Your message</span>
              <p className="mt-1 text-sm">{request.message}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <RefreshCw className="h-4 w-4" />
          Check Status
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCanceling}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          {isCanceling ? 'Canceling...' : 'Cancel Request'}
        </button>
      </div>
    </div>
  );
}
