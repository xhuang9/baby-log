'use client';

import { cn } from '@/lib/utils';

export type DateHeaderProps = {
  dates: Date[];
  gutterWidth: number;
  columnWidth: number;
  /** Current visible month to display in gutter (2-line format) */
  visibleMonth?: { month: string; year: string } | null;
  /** Callback when header is scrolled */
  onScroll?: () => void;
};

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  );
}

/**
 * Format day of week (Mon, Tue, etc.)
 */
function formatDayOfWeek(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Format day number
 */
function formatDayNumber(date: Date): number {
  return date.getDate();
}

/**
 * Date header row for week view
 * Shows month in gutter, day of week and date number for each column
 * Horizontally scrollable in sync with chart
 */
export const DateHeader = function DateHeader({ ref, dates, gutterWidth, columnWidth, visibleMonth, onScroll }: DateHeaderProps & { ref?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="flex shrink-0 border-b border-border bg-card">
      {/* Month indicator in gutter - 2 lines */}
      <div
        className="flex shrink-0 flex-col items-center justify-center border-r border-border text-[10px] font-medium text-muted-foreground md:text-xs"
        style={{ width: gutterWidth }}
      >
        {visibleMonth && (
          <>
            <span className="leading-tight">{visibleMonth.month}</span>
            <span className="leading-tight">{visibleMonth.year}</span>
          </>
        )}
      </div>

      {/* Date columns - horizontally scrollable */}
      <div
        ref={ref}
        className="scrollbar-hide flex-1 overflow-x-auto overflow-y-hidden"
        onScroll={onScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex" style={{ width: dates.length * columnWidth }}>
          {dates.map((date, index) => {
            const isTodayDate = isToday(date);
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'flex shrink-0 flex-col items-center justify-center py-1 md:py-2',
                  index > 0 && 'border-l border-border/30',
                )}
                style={{ width: columnWidth }}
              >
                <span
                  className={cn(
                    'text-[10px] md:text-xs',
                    isTodayDate ? 'font-medium text-primary' : 'text-muted-foreground',
                  )}
                >
                  {formatDayOfWeek(date)}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium md:text-sm',
                    isTodayDate
                      ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground md:h-6 md:w-6'
                      : 'text-foreground',
                  )}
                >
                  {formatDayNumber(date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
