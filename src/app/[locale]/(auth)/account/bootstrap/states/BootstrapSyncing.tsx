'use client';

import { Cloud, Loader2 } from 'lucide-react';

export function BootstrapSyncing() {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="relative">
          <Cloud className="h-12 w-12 text-primary" />
          <Loader2 className="absolute -right-1 -bottom-1 h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Syncing</h1>
        <p className="text-sm text-muted-foreground">
          Synchronizing your data...
        </p>
      </div>
    </div>
  );
}
