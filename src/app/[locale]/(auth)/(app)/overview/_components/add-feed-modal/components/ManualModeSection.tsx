import type { FeedMethod } from '@/lib/local-db';
import { BottleInputs } from './BottleInputs';
import { BreastInputs } from './BreastInputs';

type ManualModeSectionProps = {
  method: FeedMethod;
  startTime: Date;
  onStartTimeChange: (time: Date) => void;
  endTime: Date;
  onEndTimeChange: (time: Date) => void;
  amountMl: number;
  onAmountChange: (amount: number) => void;
  endSide: 'left' | 'right';
  onEndSideChange: (side: 'left' | 'right') => void;
  handMode: 'left' | 'right';
};

export function ManualModeSection({
  method,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  amountMl,
  onAmountChange,
  endSide,
  onEndSideChange,
  handMode,
}: ManualModeSectionProps) {
  if (method === 'bottle') {
    return (
      <BottleInputs
        startTime={startTime}
        onStartTimeChange={onStartTimeChange}
        amountMl={amountMl}
        onAmountChange={onAmountChange}
        handMode={handMode}
      />
    );
  }

  return (
    <BreastInputs
      startTime={startTime}
      onStartTimeChange={onStartTimeChange}
      endTime={endTime}
      onEndTimeChange={onEndTimeChange}
      endSide={endSide}
      onEndSideChange={onEndSideChange}
      handMode={handMode}
    />
  );
}
