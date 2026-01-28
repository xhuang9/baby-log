'use client';

import type { TimeTab } from '../types';
import { cn } from '@/lib/utils';

type TimeTabSelectorProps = {
  activeTab: TimeTab;
  onTabChange: (tab: TimeTab) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

export function TimeTabSelector({
  activeTab,
  onTabChange,
  handMode = 'right',
  className,
}: TimeTabSelectorProps) {
  const tabs: { key: TimeTab; label: string }[] = [
    { key: 'start', label: 'Start time' },
    { key: 'end', label: 'End time' },
  ];

  const isRightHanded = handMode === 'right';

  return (
    <div
      className={cn(
        'flex items-center',
        isRightHanded ? 'justify-between' : 'justify-start',
        className,
      )}
    >
      {/* "Time" label only for right-handed mode */}
      {isRightHanded && (
        <span className="text-sm text-muted-foreground">Time</span>
      )}

      {/* Tabs container - always together */}
      <div className="flex items-center gap-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'relative py-1 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'text-primary'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
