type TimeDisplayProps = {
  formattedTime: string;
};

/**
 * Displays the currently selected time at the top of the swiper.
 */
export function TimeDisplay({ formattedTime }: TimeDisplayProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-10 text-center">
      <span className="text-3xl font-semibold tracking-tight">
        {formattedTime}
      </span>
    </div>
  );
}
