'use client';

import { Loader2 } from 'lucide-react';

export function BootstrapInit() {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Loading</h1>
        <p className="text-sm text-muted-foreground">
          Preparing your account...
        </p>
      </div>
    </div>
  );
}
