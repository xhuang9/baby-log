'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const activityClasses = {
  'feed': 'activity-tile--feed',
  'sleep': 'activity-tile--sleep',
  'nappy': 'activity-tile--nappy',
  'solids': 'activity-tile--solids',
  'bath': 'activity-tile--bath',
  'tummy-time': 'activity-tile--tummy-time',
  'story-time': 'activity-tile--story-time',
  'screen-time': 'activity-tile--screen-time',
  'skin-to-skin': 'activity-tile--skin-to-skin',
  'outdoor-play': 'activity-tile--outdoor-play',
  'indoor-play': 'activity-tile--indoor-play',
  'brush-teeth': 'activity-tile--brush-teeth',
} as const;

export type ActivityType = keyof typeof activityClasses;

export type ActivityTileProps = {
  title: string;
  subtitle: string;
  activity: ActivityType;
  disabled?: boolean;
  onClick?: () => void;
  rightContent?: ReactNode;
  className?: string;
};

export function ActivityTile({
  title,
  subtitle,
  activity,
  disabled,
  onClick,
  rightContent,
  className,
}: ActivityTileProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'activity-tile',
        activityClasses[activity],
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="activity-tile-title">{title}</h3>
        <p className="activity-tile-label truncate">{subtitle}</p>
      </div>
      {rightContent && (
        <div className="ml-4 shrink-0">
          {rightContent}
        </div>
      )}
    </button>
  );
}
