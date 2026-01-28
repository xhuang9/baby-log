import { TimerWidget } from '@/components/feed/TimerWidget';
import { EndSideToggle } from './EndSideToggle';

type TimerModeSectionProps = {
  babyId: number;
  endSide: 'left' | 'right';
  onEndSideChange: (side: 'left' | 'right') => void;
  handMode: 'left' | 'right';
};

export function TimerModeSection({
  babyId,
  endSide,
  onEndSideChange,
  handMode,
}: TimerModeSectionProps) {
  return (
    <div className="space-y-3">
      {/* Timer Widget */}
      <TimerWidget babyId={babyId} logType="feed" />

      {/* End Side for breast feed */}
      <EndSideToggle endSide={endSide} onEndSideChange={onEndSideChange} handMode={handMode} />
    </div>
  );
}
