'use client';

import type { ActivityType } from '@/hooks/useLogsFilters';
import { Button } from '@/components/ui/button';
import { ACTIVITY_TYPES } from '@/hooks/useLogsFilters';

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

export type ActivityTypePillsProps = {
  activeTypes: ActivityType[];
  setActiveTypes: (types: ActivityType[]) => void;
};

/**
 * Activity type filter pills (All, Feed, Sleep)
 * Simplified version without time range dropdown, for Today and Week chart views
 */
export function ActivityTypePills({
  activeTypes,
  setActiveTypes,
}: ActivityTypePillsProps) {
  const isAllSelected = activeTypes.length === ACTIVITY_TYPES.length;

  const handleAllClick = () => {
    setActiveTypes(ACTIVITY_TYPES.map(t => t.value));
  };

  const handleTypeClick = (type: ActivityType) => {
    if (isAllSelected) {
      setActiveTypes([type]);
    } else if (activeTypes.includes(type)) {
      const newTypes = activeTypes.filter(t => t !== type);
      if (newTypes.length === 0) {
        setActiveTypes(ACTIVITY_TYPES.map(t => t.value));
      } else {
        setActiveTypes(newTypes);
      }
    } else {
      setActiveTypes([...activeTypes, type]);
    }
  };

  return (
    <div className="flex flex-row items-center gap-1.5 overflow-x-auto md:gap-2">
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
