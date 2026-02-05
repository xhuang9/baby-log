import { DualTimeSwiper } from '@/components/feed/time-swiper';

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
    <DualTimeSwiper
      startTime={startTime}
      onStartTimeChange={onStartTimeChange}
      endTime={endTime}
      onEndTimeChange={onEndTimeChange}
      handMode={handMode}
    />
  );
}
