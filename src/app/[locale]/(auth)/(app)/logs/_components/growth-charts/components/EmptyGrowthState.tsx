'use client';

import { Ruler } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyGrowthStateProps = {
  className?: string;
};

export function EmptyGrowthState({ className }: EmptyGrowthStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-4 text-center', className)}>
      <div className="rounded-full bg-muted p-3">
        <Ruler className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No growth measurements yet</p>
        <p className="text-xs text-muted-foreground">
          Add growth logs to see your baby&apos;s progress on the chart
        </p>
      </div>
    </div>
  );
}
