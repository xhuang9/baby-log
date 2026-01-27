'use client';

/**
 * Generate array of hour labels (0-23)
 */
function getHourLabels(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * Format hour for display (e.g., "0" -> "00", "14" -> "14")
 */
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}`;
}

export type TimelineGridProps = {
  children: React.ReactNode;
  hourHeight: number;
  totalHeight: number;
  gutterWidth: number;
};

/**
 * Timeline grid with 24-hour y-axis labels and horizontal grid lines
 */
export function TimelineGrid({
  children,
  hourHeight,
  totalHeight,
  gutterWidth,
}: TimelineGridProps) {
  const hours = getHourLabels();

  return (
    <div className="relative flex" style={{ height: totalHeight }}>
      {/* Hour labels gutter */}
      <div
        className="shrink-0 border-r border-border"
        style={{ width: gutterWidth }}
      >
        {hours.map(hour => (
          <div
            key={hour}
            className="relative"
            style={{ height: hourHeight }}
          >
            <span
              className="absolute right-1 text-[10px] text-muted-foreground md:right-2 md:text-xs"
              style={{ top: -5 }}
            >
              {formatHour(hour)}
            </span>
          </div>
        ))}
      </div>

      {/* Main grid area with lines */}
      <div className="relative flex-1">
        {/* Horizontal grid lines */}
        {hours.map(hour => (
          <div
            key={hour}
            className="absolute right-0 left-0 border-t border-border/50"
            style={{ top: hour * hourHeight }}
          />
        ))}
        {/* Final line at bottom (hour 24) */}
        <div
          className="absolute right-0 left-0 border-t border-border/50"
          style={{ top: 24 * hourHeight }}
        />

        {/* Half-hour dashed lines */}
        {hours.map(hour => (
          <div
            key={`half-${hour}`}
            className="absolute right-0 left-0 border-t border-dashed border-border/30"
            style={{ top: hour * hourHeight + hourHeight / 2 }}
          />
        ))}

        {/* Content area for day columns and blocks */}
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}
