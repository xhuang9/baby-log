'use client';

import type { TimelineMode } from './types';
import type { UnifiedLog } from '@/lib/format-log';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateHeader } from './DateHeader';
import { DayColumn } from './DayColumn';
import { useCurrentTime } from './hooks/useCurrentTime';
import { useResponsiveDays } from './hooks/useResponsiveDays';
import { useTimelineData, useTimelineDataForDay } from './hooks/useTimelineData';
import { SelectedActivityDetail } from './SelectedActivityDetail';
import { GUTTER_WIDTH, GUTTER_WIDTH_MOBILE, HOUR_OFFSET } from './types';

export type ActivityTimelineChartProps = {
  logs: UnifiedLog[] | undefined;
  mode: TimelineMode;
  onEditLog: (log: UnifiedLog) => void;
};

/** Minimum days to show */
const MIN_DAYS_TO_SHOW = 14;

const MD_BREAKPOINT = 768;

/** Height threshold for compact mode (2-hour intervals) and bottom panel layout */
const COMPACT_HEIGHT_THRESHOLD = 900;

/**
 * Generate hours starting at 6am: [6, 7, 8... 23, 0, 1, 2, 3, 4, 5, 6]
 * Returns 25 hours to show the closing 6am line
 */
function getHoursStartingAt6AM(): number[] {
  return Array.from({ length: 25 }, (_, i) => (i + HOUR_OFFSET) % 24);
}

/**
 * Get dates for week view (from start date to today)
 */
function getDatesFromStartToToday(startDate: Date): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Generate dates from start to today
  let currentDate = new Date(start);
  const todayTime = today.getTime();
  while (currentDate.getTime() <= todayTime) {
    dates.push(new Date(currentDate));
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Find the earliest log date from logs array
 */
function findEarliestLogDate(logs: UnifiedLog[] | undefined): Date | null {
  if (!logs || logs.length === 0) {
    return null;
  }

  let earliest = logs[0]!.startedAt;
  for (const log of logs) {
    if (log.startedAt < earliest) {
      earliest = log.startedAt;
    }
  }

  return earliest;
}

/**
 * Format date as YYYY-MM-DD key
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format month for display - returns short month and year separately for 2-line display
 */
function formatMonthYear(date: Date): { month: string; year: string } {
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear().toString();
  return { month, year };
}

/**
 * Main timeline chart component
 * Supports both today (single column) and week (horizontally scrollable) views
 * Chart fits 100% height - all 24 hours visible without scrolling
 */
export function ActivityTimelineChart({
  logs,
  mode,
  onEditLog,
}: ActivityTimelineChartProps) {
  const [selectedLog, setSelectedLog] = useState<UnifiedLog | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<{ month: string; year: string } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const dateHeaderScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = useRef(false);
  const [dimensions, setDimensions] = useState({ hourHeight: 0, totalHeight: 0, gutterWidth: GUTTER_WIDTH_MOBILE, columnWidth: 50, screenHeight: 0 });
  const { isToday } = useCurrentTime();

  // Responsive number of visible days for week view
  const visibleDays = useResponsiveDays();

  // Find earliest log date to determine scroll range
  const earliestLogDate = useMemo(() => findEarliestLogDate(logs), [logs]);

  // All dates for horizontal scrolling (from earliest log to today, minimum 14 days)
  const allDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate minimum start date (14 days ago)
    const minStartDate = new Date(today);
    minStartDate.setDate(minStartDate.getDate() - MIN_DAYS_TO_SHOW + 1);

    // Use earliest log date or minimum start date, whichever is earlier
    let startDate = minStartDate;
    if (earliestLogDate) {
      const logStart = new Date(earliestLogDate);
      logStart.setHours(0, 0, 0, 0);
      startDate = logStart < minStartDate ? logStart : minStartDate;
    }

    return getDatesFromStartToToday(startDate);
  }, [earliestLogDate]);

  // Calculate dimensions based on chart body height (100% fit)
  useEffect(() => {
    const calculateDimensions = () => {
      // Use chart body ref if available, fallback to container for initial render
      const measureElement = chartBodyRef.current || chartContainerRef.current;
      if (!measureElement) {
        return;
      }

      const bodyHeight = measureElement.clientHeight;
      const containerWidth = chartContainerRef.current?.clientWidth ?? 0;
      const isMobile = window.innerWidth < MD_BREAKPOINT;
      const gutterWidth = isMobile ? GUTTER_WIDTH_MOBILE : GUTTER_WIDTH;

      // Calculate hour height to fit all 24 hours in the chart body area
      const hourHeight = Math.floor(bodyHeight / 24);
      const totalHeight = hourHeight * 24;

      // Calculate column width for week view
      const availableWidth = containerWidth - gutterWidth;
      const columnWidth = visibleDays > 0 ? Math.floor(availableWidth / visibleDays) : 50;

      // Track screen height for compact mode
      const screenHeight = window.innerHeight;

      setDimensions({ hourHeight, totalHeight, gutterWidth, columnWidth, screenHeight });
    };

    // Use ResizeObserver for accurate measurements after layout
    const resizeObserver = new ResizeObserver(() => {
      calculateDimensions();
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => {
      window.removeEventListener('resize', calculateDimensions);
      resizeObserver.disconnect();
    };
  }, [mode, visibleDays]);

  // Today view data
  const today = useMemo(() => new Date(), []);
  const todayData = useTimelineDataForDay(logs, today, dimensions.hourHeight);

  // Week view data (all loaded dates)
  const weekStart = allDates[0]!;
  const weekEnd = useMemo(() => {
    const end = new Date(allDates[allDates.length - 1]!);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [allDates]);
  const weekData = useTimelineData(logs, { start: weekStart, end: weekEnd }, dimensions.hourHeight);

  // Convert week data to map for easy lookup
  const weekDataMap = useMemo(() => {
    const map = new Map<string, typeof weekData[0]>();
    for (const day of weekData) {
      map.set(day.dateKey, day);
    }
    return map;
  }, [weekData]);

  // Use columnWidth from dimensions
  const { columnWidth } = dimensions;

  // Scroll to show most recent dates (right side) on mount
  useEffect(() => {
    if (mode === 'week' && horizontalScrollRef.current) {
      // Scroll to the end (most recent dates)
      const scrollRight = horizontalScrollRef.current.scrollWidth;
      horizontalScrollRef.current.scrollLeft = scrollRight;
      // Also sync header
      if (dateHeaderScrollRef.current) {
        dateHeaderScrollRef.current.scrollLeft = scrollRight;
      }
    }
  }, [mode, dimensions.hourHeight]);

  // Update visible month and sync scroll positions
  const updateVisibleMonth = useCallback((scrollLeft: number) => {
    if (columnWidth === 0) {
      return;
    }

    // Calculate which date is at the left edge of the visible area
    const firstVisibleIndex = Math.floor(scrollLeft / columnWidth);
    const clampedIndex = Math.max(0, Math.min(firstVisibleIndex, allDates.length - 1));
    const firstVisibleDate = allDates[clampedIndex];

    if (firstVisibleDate) {
      setVisibleMonth(formatMonthYear(firstVisibleDate));
    }
  }, [allDates, columnWidth]);

  // Handle scroll from chart body - sync to header
  const handleHorizontalScroll = useCallback(() => {
    if (!horizontalScrollRef.current || isScrollingSyncRef.current) {
      return;
    }

    const scrollLeft = horizontalScrollRef.current.scrollLeft;
    updateVisibleMonth(scrollLeft);

    // Sync header scroll
    if (dateHeaderScrollRef.current) {
      isScrollingSyncRef.current = true;
      dateHeaderScrollRef.current.scrollLeft = scrollLeft;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
  }, [updateVisibleMonth]);

  // Handle scroll from date header - sync to chart body
  const handleDateHeaderScroll = useCallback(() => {
    if (!dateHeaderScrollRef.current || isScrollingSyncRef.current) {
      return;
    }

    const scrollLeft = dateHeaderScrollRef.current.scrollLeft;
    updateVisibleMonth(scrollLeft);

    // Sync chart body scroll
    if (horizontalScrollRef.current) {
      isScrollingSyncRef.current = true;
      horizontalScrollRef.current.scrollLeft = scrollLeft;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
  }, [updateVisibleMonth]);

  // Set initial visible month on mount
  useEffect(() => {
    if (allDates.length > 0 && !visibleMonth) {
      // Initially show the last visible dates (most recent)
      const lastVisibleIndex = Math.max(0, allDates.length - visibleDays);
      const firstVisibleDate = allDates[lastVisibleIndex];
      if (firstVisibleDate) {
        setVisibleMonth(formatMonthYear(firstVisibleDate));
      }
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBlockClick = useCallback((log: UnifiedLog) => {
    setSelectedLog(log);
  }, []);

  const handleEditLog = useCallback(
    (log: UnifiedLog) => {
      onEditLog(log);
    },
    [onEditLog],
  );

  // Don't render until dimensions are calculated
  if (dimensions.hourHeight === 0) {
    return (
      <div
        ref={chartContainerRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
      />
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      {/* Week view date header */}
      {mode === 'week' && (
        <DateHeader
          ref={dateHeaderScrollRef}
          dates={allDates}
          gutterWidth={dimensions.gutterWidth}
          columnWidth={columnWidth}
          visibleMonth={visibleMonth}
          onScroll={handleDateHeaderScroll}
        />
      )}

      {/* Chart area - no vertical scroll, horizontal scroll for week view */}
      <div ref={chartBodyRef} className="flex min-h-0 flex-1">
        {/* Hour labels gutter - starts at 6am, ends at 6am */}
        <div
          className="shrink-0 border-r border-border pt-0 pb-3"
          style={{ width: dimensions.gutterWidth }}
        >
          {getHoursStartingAt6AM().map((hour, index) => {
            // On small screens (<600px height), only show every 2 hours
            const isCompactMode = dimensions.screenHeight < COMPACT_HEIGHT_THRESHOLD;
            const showLabel = !isCompactMode || index % 2 === 0;
            // Position adjustments: first label below line, last label above line
            const isFirst = index === 0;
            const isLast = index === 24;
            const topOffset = isFirst ? 2 : isLast ? -12 : -5;

            return (
              <div
                key={`hour-${index}`}
                className="relative"
                style={{ height: index < 24 ? dimensions.hourHeight : 0 }}
              >
                {showLabel && (
                  <span
                    className="absolute right-1 text-[10px] text-muted-foreground md:right-2 md:text-xs"
                    style={{ top: topOffset }}
                  >
                    {hour.toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Main chart area */}
        {/* eslint-disable-next-line style/multiline-ternary */}
        {mode === 'today' ? (
          // Today view - single column, no scroll
          <div className="relative flex-1">
            {/* Grid lines */}
            {Array.from({ length: 25 }, (_, hour) => (
              <div
                key={hour}
                className="absolute right-0 left-0 border-t border-border/50"
                style={{ top: hour * dimensions.hourHeight }}
              />
            ))}
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={`half-${hour}`}
                className="absolute right-0 left-0 border-t border-dashed border-border/30"
                style={{ top: hour * dimensions.hourHeight + dimensions.hourHeight / 2 }}
              />
            ))}
            <DayColumn
              blocks={todayData?.blocks ?? []}
              showLabels={true}
              selectedLogId={selectedLog?.id}
              onBlockClick={handleBlockClick}
              isToday={true}
              totalHeight={dimensions.totalHeight}
              hourHeight={dimensions.hourHeight}
            />
          </div>
        ) : (
          // Week view - horizontally scrollable
          <div
            ref={horizontalScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            onScroll={handleHorizontalScroll}
          >
            <div
              className="relative flex"
              style={{
                width: allDates.length * columnWidth,
                height: dimensions.totalHeight,
              }}
            >
              {/* Grid lines spanning all columns */}
              {Array.from({ length: 25 }, (_, hour) => (
                <div
                  key={hour}
                  className="absolute right-0 left-0 border-t border-border/50"
                  style={{ top: hour * dimensions.hourHeight }}
                />
              ))}
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={`half-${hour}`}
                  className="absolute right-0 left-0 border-t border-dashed border-border/30"
                  style={{ top: hour * dimensions.hourHeight + dimensions.hourHeight / 2 }}
                />
              ))}

              {/* Day columns */}
              {allDates.map((date) => {
                const dateKey = formatDateKey(date);
                const dayData = weekDataMap.get(dateKey);
                return (
                  <div
                    key={dateKey}
                    className="relative shrink-0 border-l border-border/30 first:border-l-0"
                    style={{ width: columnWidth, height: dimensions.totalHeight }}
                  >
                    <DayColumn
                      blocks={dayData?.blocks ?? []}
                      showLabels={false}
                      selectedLogId={selectedLog?.id}
                      onBlockClick={handleBlockClick}
                      isToday={isToday(date)}
                      totalHeight={dimensions.totalHeight}
                      hourHeight={dimensions.hourHeight}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected activity detail panel - always visible below chart */}
      <SelectedActivityDetail
        log={selectedLog}
        onEdit={handleEditLog}
      />
    </div>
  );
}
