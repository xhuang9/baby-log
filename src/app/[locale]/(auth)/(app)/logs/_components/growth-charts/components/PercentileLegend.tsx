'use client';

import { cn } from '@/lib/utils';

type PercentileLegendProps = {
  className?: string;
};

export function PercentileLegend({ className }: PercentileLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs', className)}>
      {/* Baby measurement */}
      <div className="flex items-center gap-1.5">
        <div className="size-2.5 rounded-full bg-[hsl(var(--chart-1))]" />
        <span className="text-muted-foreground">Baby</span>
      </div>

      {/* 50th percentile (median) */}
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-4 bg-[hsl(var(--primary))]" />
        <span className="text-muted-foreground">50th</span>
      </div>

      {/* 15th/85th percentiles */}
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-4 border-t border-dashed border-[hsl(var(--muted-foreground)/0.7)]" />
        <span className="text-muted-foreground">15th/85th</span>
      </div>

      {/* 3rd/97th percentiles */}
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 w-4 border-t border-dashed border-[hsl(var(--muted-foreground)/0.5)]" />
        <span className="text-muted-foreground">3rd/97th</span>
      </div>
    </div>
  );
}
