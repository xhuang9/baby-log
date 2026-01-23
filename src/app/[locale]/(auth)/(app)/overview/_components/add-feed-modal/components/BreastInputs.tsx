import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { Label } from '@/components/ui/label';
import { DurationDisplay } from '@/components/activity-modals';
import { EndSideToggle } from './EndSideToggle';

type BreastInputsProps = {
  startTime: Date;
  onStartTimeChange: (time: Date) => void;
  endTime: Date;
  onEndTimeChange: (time: Date) => void;
  endSide: 'left' | 'right';
  onEndSideChange: (side: 'left' | 'right') => void;
  handMode: 'left' | 'right';
};

export function BreastInputs({
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  endSide,
  onEndSideChange,
  handMode,
}: BreastInputsProps) {
  return (
    <>
      {/* Start Time */}
      <div className="space-y-3">
        <Label className="text-muted-foreground">Start time</Label>
        <TimeSwiper value={startTime} onChange={onStartTimeChange} handMode={handMode} />
      </div>

      {/* End Time */}
      <div className="space-y-3">
        <Label className="text-muted-foreground">End time</Label>
        <TimeSwiper value={endTime} onChange={onEndTimeChange} handMode={handMode} />
      </div>

      {/* Calculated Duration */}
      <DurationDisplay startTime={startTime} endTime={endTime} />

      {/* End Side */}
      <EndSideToggle endSide={endSide} onEndSideChange={onEndSideChange} handMode={handMode} />
    </>
  );
}
