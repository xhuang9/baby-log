import { calculateDuration, formatDuration } from './utils';

type DurationDisplayProps = {
  startTime: Date;
  endTime: Date;
};

export function DurationDisplay({ startTime, endTime }: DurationDisplayProps) {
  const durationMinutes = calculateDuration(startTime, endTime);
  const formattedDuration = formatDuration(durationMinutes);

  return (
    <div className="flex items-center justify-center py-2">
      <div className="rounded-lg bg-muted/50 px-4 py-2">
        <span className="text-sm text-muted-foreground">Duration: </span>
        <span className="text-lg font-semibold">{formattedDuration}</span>
      </div>
    </div>
  );
}
