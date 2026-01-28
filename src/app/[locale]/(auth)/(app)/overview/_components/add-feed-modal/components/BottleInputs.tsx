import { AmountSlider } from '@/components/feed/AmountSlider';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
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
      <div className="space-y-3">
        <Label className="text-muted-foreground">Start time</Label>
        <TimeSwiper value={startTime} onChange={onStartTimeChange} handMode={handMode} />
      </div>

      <div className="space-y-3">
        <Label className="text-muted-foreground">Amount</Label>
        <AmountSlider value={amountMl} onChange={onAmountChange} handMode={handMode} />
      </div>
    </>
  );
}
