'use client';

import type { AccessRequest } from '@/actions/accessRequestActions';
import { useEffect, useState } from 'react';
import {
  cancelAccessRequest,
  createAccessRequest,
  listOutgoingRequests,
} from '@/actions/accessRequestActions';

export function RequestAccessForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [accessLevel, setAccessLevel] = useState<'viewer' | 'editor' | 'owner'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshRequests = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Load pending requests on mount and when refreshTrigger changes
  useEffect(() => {
    let cancelled = false;

    const fetchRequests = async () => {
      setIsLoadingRequests(true);
      const result = await listOutgoingRequests();
      if (!cancelled && result.success) {
        setPendingRequests(result.requests.filter(r => r.status === 'pending'));
      }
      if (!cancelled) {
        setIsLoadingRequests(false);
      }
    };

    void fetchRequests();

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await createAccessRequest({
        targetEmail: email.trim(),
        message: message.trim() || undefined,
        requestedAccessLevel: accessLevel,
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success - show message and clear form
      setSuccessMessage(result.message);
      setEmail('');
      setMessage('');
      setAccessLevel('viewer');

      // Reload pending requests
      refreshRequests();

      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (requestId: number) => {
    try {
      const result = await cancelAccessRequest({ requestId });
      if (result.success) {
        refreshRequests();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
              {successMessage}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Owner's Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              placeholder="owner@example.com"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the email address of the person who owns the baby
            </p>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium">
              Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              placeholder="Hi! I'd like to help track baby's activities and milestones."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {message.length}
              /500 characters
            </p>
          </div>

          <div>
            <label htmlFor="accessLevel" className="block text-sm font-medium">
              Requested Access Level
            </label>
            <select
              id="accessLevel"
              value={accessLevel}
              onChange={e => setAccessLevel(e.target.value as typeof accessLevel)}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="viewer">Viewer (read-only access)</option>
              <option value="editor">Editor (can add and edit entries)</option>
              <option value="owner">Owner (full access)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              The owner can adjust this when approving your request
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? 'Sending Request...' : 'Send Access Request'}
          </button>
        </form>
      </div>

      {/* Pending Requests List */}
      {isLoadingRequests
        ? (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-center text-sm text-muted-foreground">Loading your requests...</p>
            </div>
          )
        : pendingRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Pending Requests</h2>

            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.targetEmail}</p>
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Pending
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Access Level:
                      {' '}
                      {request.requestedAccessLevel}
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
                    onClick={() => handleCancel(request.id)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
