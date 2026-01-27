import { AmountSlider } from '@/components/feed/AmountSlider';
import { TimeSwiperWithDate } from '@/components/feed/TimeSwiper';
import { Label } from '@/components/ui/label';

type BottleInputsProps = {
  startTime: Date;
  onStartTimeChange: (time: Date) => void;
  amountMl: number;
  onAmountChange: (amount: number) => void;
  handMode: 'left' | 'right';
};

export function BottleInputs({
  startTime,
  onStartTimeChange,
  amountMl,
  onAmountChange,
  handMode,
}: BottleInputsProps) {
  return (
    <>
      {/* Time Swiper */}
      <div className="space-y-3">
        <Label className="text-muted-foreground">Start time</Label>
        <TimeSwiperWithDate value={startTime} onChange={onStartTimeChange} handMode={handMode} />
      </div>

      {/* Amount Slider */}
      <div className="space-y-3">
        <Label className="text-muted-foreground">Amount</Label>
        <AmountSlider value={amountMl} onChange={onAmountChange} handMode={handMode} />
      </div>
    </>
  );
}
