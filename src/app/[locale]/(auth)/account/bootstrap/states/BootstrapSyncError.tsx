'use client';

import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

type BootstrapSyncErrorProps = {
  error: string;
  canRetry: boolean;
  onRetry: () => void;
};

export function BootstrapSyncError(props: BootstrapSyncErrorProps) {
  const { error, canRetry, onRetry } = props;

  const isNetworkError = error.toLowerCase().includes('network')
    || error.toLowerCase().includes('fetch')
    || error.toLowerCase().includes('internet');

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-destructive/10 p-4">
          {isNetworkError
            ? (
                <WifiOff className="h-12 w-12 text-destructive" />
              )
            : (
                <AlertCircle className="h-12 w-12 text-destructive" />
              )}
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {isNetworkError ? 'Connection Failed' : 'Something Went Wrong'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {error}
        </p>
      </div>

      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
