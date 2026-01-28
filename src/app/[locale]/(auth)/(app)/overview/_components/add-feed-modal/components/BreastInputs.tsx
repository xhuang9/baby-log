import { DualTimeSwiper } from '@/components/feed/time-swiper';
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
      <DualTimeSwiper
        startTime={startTime}
        onStartTimeChange={onStartTimeChange}
        endTime={endTime}
        onEndTimeChange={onEndTimeChange}
        handMode={handMode}
      />

      <EndSideToggle endSide={endSide} onEndSideChange={onEndSideChange} handMode={handMode} />
    </>
  );
}
