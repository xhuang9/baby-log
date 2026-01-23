import type { InputMode } from '@/components/activity-modals';

export type AddSleepModalProps = {
  babyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export type { InputMode };

export type SleepFormState = {
  inputMode: InputMode;
  startTime: Date;
  endTime: Date;
  handMode: 'left' | 'right';
};
