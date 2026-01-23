'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createAccessRequest } from '@/actions/accessRequestActions';

type RequestAccessSectionProps = {
  redirectPath: string;
  onSuccess?: () => void;
};

export function RequestAccessSection({ redirectPath, onSuccess }: RequestAccessSectionProps) {
  const router = useRouter();

  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequesting(true);
    setRequestError(null);
    setRequestSuccess(false);

    try {
      const result = await createAccessRequest({
        targetEmail,
        message: requestMessage || undefined,
        requestedAccessLevel: 'editor',
      });

      if (!result.success) {
        setRequestError(result.error);
        setIsRequesting(false);
        return;
      }

      // Show success and reset form
      setRequestSuccess(true);
      setTargetEmail('');
      setRequestMessage('');

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect after a delay
      setTimeout(() => {
        router.replace(redirectPath);
      }, 2000);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to send request');
      setIsRequesting(false);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setShowAccessRequest(!showAccessRequest)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-muted/50"
      >
        <span>Request access from someone</span>
        {showAccessRequest ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAccessRequest && (
        <div className="border-t p-4">
          {requestSuccess
            ? (
                <div className="space-y-4">
                  <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
                    Access request sent successfully! You'll be notified when it's approved.
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequestSuccess(false)}
                    className="w-full rounded-md border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Send Another Request
                  </button>
                </div>
              )
            : (
                <form onSubmit={handleAccessRequest} className="space-y-4">
                  {requestError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {requestError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="targetEmail" className="block text-sm font-medium">
                      Caregiver's Email Address
                    </label>
                    <input
                      id="targetEmail"
                      type="email"
                      value={targetEmail}
                      onChange={e => setTargetEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                      placeholder="caregiver@example.com"
                      required
                      disabled={isRequesting}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter the email of the person who has access to the baby
                    </p>
                  </div>

                  <div>
                    <label htmlFor="requestMessage" className="block text-sm font-medium">
                      Message (Optional)
                    </label>
                    <textarea
                      id="requestMessage"
                      value={requestMessage}
                      onChange={e => setRequestMessage(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                      placeholder="Hi, I'd like to access the baby's information..."
                      disabled={isRequesting}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {requestMessage.length}
                      /500 characters
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isRequesting || !targetEmail}
                    className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isRequesting ? 'Sending Request...' : 'Send Request'}
                  </button>
                </form>
              )}
        </div>
      )}
    </div>
  );
}
