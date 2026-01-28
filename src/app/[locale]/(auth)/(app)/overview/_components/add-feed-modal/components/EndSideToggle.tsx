import { BaseButton } from '@/components/base/BaseButton';
import { Label } from '@/components/ui/label';

type EndSideToggleProps = {
  endSide: 'left' | 'right';
  onEndSideChange: (side: 'left' | 'right') => void;
  handMode: 'left' | 'right';
};

export function EndSideToggle({ endSide, onEndSideChange, handMode }: EndSideToggleProps) {
  return (
    <div
      className={`${handMode === 'left' ? 'space-y-3' : 'flex items-center justify-between'}`}
    >
      <Label className="text-muted-foreground">Last side</Label>
      <div className={`flex gap-3 ${handMode === 'left' ? '' : 'ml-auto'}`}>
        <BaseButton
          variant={endSide === 'left' ? 'primary' : 'secondary'}
          onClick={() => onEndSideChange('left')}
        >
          Left
        </BaseButton>
        <BaseButton
          variant={endSide === 'right' ? 'primary' : 'secondary'}
          onClick={() => onEndSideChange('right')}
        >
          Right
        </BaseButton>
      </div>
    </div>
  );
}
