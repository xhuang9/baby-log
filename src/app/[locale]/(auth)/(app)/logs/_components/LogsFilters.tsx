'use client';

import type { ActivityType, TimeRange } from '@/hooks/useLogsFilters';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ACTIVITY_TYPES,
  TIME_RANGE_OPTIONS,
} from '@/hooks/useLogsFilters';

const activityPillClasses: Record<ActivityType, string> = {
  feed: 'activity-pill--feed',
  sleep: 'activity-pill--sleep',
  nappy: 'activity-pill--nappy',
  solids: 'activity-pill--solids',
  pumping: 'activity-pill--pumping',
  growth: 'activity-pill--growth',
  bath: 'activity-pill--bath',
  medication: 'activity-pill--medication',
  activity: 'activity-pill--activity',
};

export type LogsFiltersProps = {
  activeTypes: ActivityType[];
  setActiveTypes: (types: ActivityType[]) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
};

/**
 * Filter controls for activity logs
 * Allows filtering by activity type (Feed, Sleep) with pills and time range dropdown
 */
export function LogsFilters({
  activeTypes,
  setActiveTypes,
  timeRange,
  setTimeRange,
}: LogsFiltersProps) {
  const isAllSelected = activeTypes.length === ACTIVITY_TYPES.length;

  const handleAllClick = () => {
    // Select all types
    setActiveTypes(ACTIVITY_TYPES.map(t => t.value));
  };

  const handleTypeClick = (type: ActivityType) => {
    if (isAllSelected) {
      // If "All" was selected, now select only this type
      setActiveTypes([type]);
    } else if (activeTypes.includes(type)) {
      // Deselect this type (but keep at least one selected)
      const newTypes = activeTypes.filter(t => t !== type);
      if (newTypes.length === 0) {
        // If deselecting would leave none, select all instead
        setActiveTypes(ACTIVITY_TYPES.map(t => t.value));
      } else {
        setActiveTypes(newTypes);
      }
    } else {
      // Add this type to selection
      setActiveTypes([...activeTypes, type]);
    }
  };

  // Get label for current time range
  const timeRangeLabel = TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange)?.label || timeRange;

  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      {/* Time Range Filter - Dropdown Menu (first) */}
      <DropdownMenu>
        <DropdownMenuTrigger className="group/button inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">
          {timeRangeLabel}
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {TIME_RANGE_OPTIONS.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => setTimeRange(value)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Activity Type Pills */}
      <Button
        variant={isAllSelected ? 'default' : 'outline'}
        size="sm"
        onClick={handleAllClick}
      >
        All
      </Button>
      {ACTIVITY_TYPES.map(({ value, label }) => {
        const isSelected = !isAllSelected && activeTypes.includes(value);
        return (
          <Button
            key={value}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            className={isSelected ? activityPillClasses[value] : undefined}
            onClick={() => handleTypeClick(value)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
