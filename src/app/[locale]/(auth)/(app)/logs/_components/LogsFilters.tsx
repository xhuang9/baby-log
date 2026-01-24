'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon, Minus, Plus } from 'lucide-react';
import type { ActivityType, TimeRange } from '@/hooks/useLogsFilters';
import {
  ACTIVITY_TYPES,
  TIME_RANGE_OPTIONS,
} from '@/hooks/useLogsFilters';

export type ViewMode = 'simplified' | 'expanded';

export interface LogsFiltersProps {
  activeTypes: ActivityType[];
  setActiveTypes: (types: ActivityType[]) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

/**
 * Filter controls for activity logs
 * Allows filtering by activity type (Feed, Sleep) and time range
 */
export function LogsFilters({
  activeTypes,
  setActiveTypes,
  timeRange,
  setTimeRange,
  viewMode,
  setViewMode,
}: LogsFiltersProps) {
  const handleActivityTypeChange = (value: string) => {
    if (value === 'all') {
      setActiveTypes(['feed', 'sleep']);
    } else if (value === 'feed') {
      setActiveTypes(['feed']);
    } else if (value === 'sleep') {
      setActiveTypes(['sleep']);
    }
  };

  // Determine current dropdown value
  const currentActivityValue =
    activeTypes.length === 2 ? 'all' : (activeTypes[0] || '');

  // Get label for current activity type
  const activityTypeLabel =
    currentActivityValue === 'all'
      ? 'All Activities'
      : ACTIVITY_TYPES.find(opt => opt.value === currentActivityValue)?.label ||
        currentActivityValue;

  // Get label for current time range
  const timeRangeLabel = TIME_RANGE_OPTIONS.find(opt => opt.value === timeRange)?.label || timeRange;

  return (
    <div className="flex flex-row items-center gap-3">
      {/* Activity Type Filter - Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="default" size="sm" className="w-fit">
            {activityTypeLabel}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleActivityTypeChange('all')}>
            All Activities
          </DropdownMenuItem>
          {ACTIVITY_TYPES.map(({ value, label }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleActivityTypeChange(value)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Time Range Filter - Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="default" size="sm" className="w-fit">
            {timeRangeLabel}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
          </Button>
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

      {/* View Mode Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setViewMode(viewMode === 'simplified' ? 'expanded' : 'simplified')}
        className="ml-auto w-fit"
      >
        {viewMode === 'simplified' ? (
          <>
            Expanded <Plus className="ml-1 h-4 w-4" />
          </>
        ) : (
          <>
            Simplified <Minus className="ml-1 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
