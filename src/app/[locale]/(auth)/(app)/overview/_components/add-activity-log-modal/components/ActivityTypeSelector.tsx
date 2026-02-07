'use client';

import type { ActivityLogCategory } from '@/lib/local-db';
import { cn } from '@/lib/utils';

const ACTIVITY_TYPE_OPTIONS: { value: ActivityLogCategory; label: string }[] = [
  { value: 'tummy_time', label: 'Tummy Time' },
  { value: 'indoor_play', label: 'Indoor Play' },
  { value: 'outdoor_play', label: 'Outdoor Play' },
  { value: 'screen_time', label: 'Screen Time' },
  { value: 'other', label: 'Other' },
];

type ActivityTypeSelectorProps = {
  value: ActivityLogCategory;
  onChange: (value: ActivityLogCategory) => void;
};

export function ActivityTypeSelector({ value, onChange }: ActivityTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIVITY_TYPE_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            value === option.value
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
