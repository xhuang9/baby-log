'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ActivityTileProps = {
  title: string;
  subtitle: string;
  color: 'teal' | 'purple' | 'amber' | 'rose' | 'blue' | 'emerald';
  onClick?: () => void;
  rightContent?: ReactNode;
  className?: string;
};

const colorClasses = {
  teal: 'border-l-teal-500 bg-teal-500/5 hover:bg-teal-500/10',
  purple: 'border-l-purple-500 bg-purple-500/5 hover:bg-purple-500/10',
  amber: 'border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10',
  rose: 'border-l-rose-500 bg-rose-500/5 hover:bg-rose-500/10',
  blue: 'border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10',
  emerald: 'border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10',
};

export function ActivityTile({
  title,
  subtitle,
  color,
  onClick,
  rightContent,
  className,
}: ActivityTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border border-l-4 p-4 text-left transition-colors',
        colorClasses[color],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {rightContent && (
        <div className="ml-4 shrink-0">
          {rightContent}
        </div>
      )}
    </button>
  );
}
