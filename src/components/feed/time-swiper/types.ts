export type TimeSwiperProps = {
  /** Current selected date/time value */
  value: Date;
  /** Called when the full date/time changes */
  onChange: (date: Date) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

export type TickMark = {
  position: number;
  isHour: boolean;
  label: string | null;
};

export type TimeTab = 'start' | 'end';

export type DualTimeSwiperProps = {
  startTime: Date;
  onStartTimeChange: (date: Date) => void;
  endTime: Date;
  onEndTimeChange: (date: Date) => void;
  handMode?: 'left' | 'right';
  className?: string;
};
