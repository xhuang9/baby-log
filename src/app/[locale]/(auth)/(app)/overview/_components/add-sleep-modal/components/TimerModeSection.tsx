import { TimerWidget } from '@/components/feed/TimerWidget';

type TimerModeSectionProps = {
  babyId: number;
};

export function TimerModeSection({ babyId }: TimerModeSectionProps) {
  return (
    <div className="space-y-6">
      <TimerWidget babyId={babyId} logType="sleep" />
    </div>
  );
}
