'use client';

import { useState } from 'react';

type AccessRequest = {
  id: number;
  requesterName: string | null;
  requesterEmail: string | null;
  message: string | null;
  requestedAccessLevel: 'owner' | 'editor' | 'viewer';
  createdAt: Date;
};

export function AccessRequestApprovalDialog(props: {
  request: AccessRequest;
  onApprove: (babyId: number, accessLevel: 'owner' | 'editor' | 'viewer') => Promise<void>;
  onReject: () => Promise<void>;
  onClose: () => void;
}) {
  const { request, onApprove, onReject, onClose } = props;
  const [selectedBabyId, setSelectedBabyId] = useState<number | null>(null);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<'owner' | 'editor' | 'viewer'>(
    request.requestedAccessLevel,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!selectedBabyId) {
      // Early return if no baby selected
      return;
    }

    setIsSubmitting(true);
    try {
      await onApprove(selectedBabyId, selectedAccessLevel);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Review Access Request</h2>

        <div className="mb-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">From</h3>
            <p className="text-base">
              {request.requesterName || request.requesterEmail || 'Unknown'}
            </p>
          </div>

          {request.message && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
              <p className="text-base italic">
                "
                {request.message}
                "
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Requested Access Level</h3>
            <p className="text-base capitalize">{request.requestedAccessLevel}</p>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label htmlFor="baby" className="block text-sm font-medium">
              Select Baby *
            </label>
            <input
              id="baby"
              type="number"
              placeholder="Enter baby ID"
              onChange={e => setSelectedBabyId(Number(e.target.value))}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the baby ID you want to grant access to (temporary - will be replaced with dropdown)
            </p>
          </div>

          <div>
            <label htmlFor="accessLevel" className="block text-sm font-medium">
              Grant Access Level
            </label>
            <select
              id="accessLevel"
              value={selectedAccessLevel}
              onChange={e => setSelectedAccessLevel(e.target.value as typeof selectedAccessLevel)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="viewer">Viewer (read-only)</option>
              <option value="editor">Editor (can add and edit)</option>
              <option value="owner">Owner (full access)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive ring-offset-background transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Rejecting...' : 'Reject'}
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting || !selectedBabyId}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
