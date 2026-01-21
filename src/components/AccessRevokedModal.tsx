/**
 * Access Revoked Modal
 *
 * Shows a warning when a user's access to a baby has been revoked.
 */

'use client';

import { AlertTriangle } from 'lucide-react';

type AccessRevokedModalProps = {
  babyName: string;
  reason: 'no_access' | 'baby_not_found';
  onClose: () => void;
};

export function AccessRevokedModal({
  babyName,
  reason,
  onClose,
}: AccessRevokedModalProps) {
  const message = reason === 'baby_not_found'
    ? `The baby "${babyName}" no longer exists or has been removed.`
    : `Your access to "${babyName}" has been removed by the owner.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-bold">
          Access Removed
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-muted-foreground">
          {message}
        </p>

        {/* Details */}
        <div className="mb-6 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Your local data for this baby has been cleared. Any pending changes could not be synced and have been removed.
          </p>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
