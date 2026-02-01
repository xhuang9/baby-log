import type { InputMode } from '@/components/activity-modals';
import type { FeedMethod } from '@/lib/local-db';

export type AddFeedModalProps = {
  babyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Initial feed method - defaults to 'bottle'. Use 'breast' to open in timer mode. */
  initialMethod?: FeedMethod;
};

export type { InputMode };

export type FeedFormState = {
  method: FeedMethod;
  inputMode: InputMode;
  startTime: Date;
  amountMl: number;
  endTime: Date;
  endSide: 'left' | 'right';
  handMode: 'left' | 'right';
};
