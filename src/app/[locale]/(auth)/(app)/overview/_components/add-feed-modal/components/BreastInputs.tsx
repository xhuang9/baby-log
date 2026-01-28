import { DurationDisplay } from '@/components/activity-modals';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { Label } from '@/components/ui/label';
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
      <div className="space-y-3">
        <Label className="text-muted-foreground">Start time</Label>
        <TimeSwiper value={startTime} onChange={onStartTimeChange} handMode={handMode} />
      </div>

      <div className="space-y-3">
        <Label className="text-muted-foreground">End time</Label>
        <TimeSwiper value={endTime} onChange={onEndTimeChange} handMode={handMode} />
      </div>

      <DurationDisplay startTime={startTime} endTime={endTime} />

      <EndSideToggle endSide={endSide} onEndSideChange={onEndSideChange} handMode={handMode} />
    </>
  );
}
