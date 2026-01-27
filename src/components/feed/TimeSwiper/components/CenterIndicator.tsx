/**
 * Triangle pointer indicating the current selected time position.
 */
export function CenterIndicator() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-20 text-primary filter-[drop-shadow(0_2px_3px_rgba(0,0,0,0.3))_drop-shadow(0_1px_2px_rgba(0,0,0,0.2))] dark:filter-[drop-shadow(0_2px_3px_rgba(255,255,255,0.4))_drop-shadow(0_1px_2px_rgba(255,255,255,0.3))]"
      style={{
        bottom: 8,
        transform: 'translateX(-50%)',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="currentColor"
      >
        <path d="M7 0L14 14H0L7 0Z" />
      </svg>
    </div>
  );
}
