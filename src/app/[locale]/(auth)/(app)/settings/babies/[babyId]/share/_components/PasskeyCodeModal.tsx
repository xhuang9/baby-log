'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

type PasskeyCodeModalProps = {
  code: string;
  expiresAt: Date;
  onClose: () => void;
};

export function PasskeyCodeModal({ code, expiresAt, onClose }: PasskeyCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatExpiryTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-background p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">6-Digit Code Generated</h3>
          <p className="text-sm text-muted-foreground">
            Share this code with the caregiver. It expires in {formatExpiryTime(expiresAt)}.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-6">
            <span className="text-4xl font-mono font-bold tracking-[0.5em]">
              {code}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Code
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-md border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}
