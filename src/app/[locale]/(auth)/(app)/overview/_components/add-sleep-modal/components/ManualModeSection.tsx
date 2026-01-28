import { DurationDisplay } from '@/components/activity-modals';
import { TimeSwiperWithDate } from '@/components/feed/TimeSwiperWithDate';
import { Label } from '@/components/ui/label';

type ManualModeSectionProps = {
  startTime: Date;
  onStartTimeChange: (time: Date) => void;
  endTime: Date;
  onEndTimeChange: (time: Date) => void;
  handMode: 'left' | 'right';
};

export function ManualModeSection({
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  handMode,
}: ManualModeSectionProps) {
  return (
    <>
      <div className="space-y-3">
        <Label className="text-muted-foreground">Start time</Label>
        <TimeSwiperWithDate value={startTime} onChange={onStartTimeChange} handMode={handMode} />
      </div>

      <div className="space-y-3">
        <Label className="text-muted-foreground">End time</Label>
        <TimeSwiperWithDate value={endTime} onChange={onEndTimeChange} handMode={handMode} />
      </div>

      <DurationDisplay startTime={startTime} endTime={endTime} />
    </>
  );
}
