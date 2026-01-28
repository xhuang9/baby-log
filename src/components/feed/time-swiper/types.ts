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
