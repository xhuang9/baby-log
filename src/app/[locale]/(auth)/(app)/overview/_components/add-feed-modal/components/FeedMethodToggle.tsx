import type { FeedMethod } from '@/lib/local-db';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

type FeedMethodToggleProps = {
  method: FeedMethod;
  onMethodChange: (method: FeedMethod) => void;
};

export function FeedMethodToggle({ method, onMethodChange }: FeedMethodToggleProps) {
  return (
    <ButtonGroup className="w-full">
      <Button
        type="button"
        variant={method === 'bottle' ? 'default' : 'outline'}
        className="h-12 flex-1"
        onClick={() => onMethodChange('bottle')}
      >
        Bottle Feeding
      </Button>
      <Button
        type="button"
        variant={method === 'breast' ? 'default' : 'outline'}
        className="h-12 flex-1"
        onClick={() => onMethodChange('breast')}
      >
        Breast Feeding
      </Button>
    </ButtonGroup>
  );
}
