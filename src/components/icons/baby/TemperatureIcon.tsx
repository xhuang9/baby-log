import type { ComponentProps } from 'react';

export const TemperatureIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6.5 4A3.5 3.5 0 0 0 3 7.5v6A3.5 3.5 0 0 0 6.5 17H11v1.2H8.8a1 1 0 1 0 0 2h6.4a1 1 0 1 0 0-2H13V17h4.5A3.5 3.5 0 0 0 21 13.5v-6A3.5 3.5 0 0 0 17.5 4h-11Z" />
    <path d="M12.8 7.2a1 1 0 0 1 2 0v3.05a2.05 2.05 0 1 1-2 0V7.2Z" />
  </svg>
);
