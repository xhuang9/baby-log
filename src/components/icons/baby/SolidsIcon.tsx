import type { ComponentProps } from 'react';

export const SolidsIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M5.5 12.2A1.2 1.2 0 0 1 6.7 11h10.6a1.2 1.2 0 0 1 1.2 1.2c0 4.3-3.5 7.8-7.8 7.8H13.3c-4.3 0-7.8-3.5-7.8-7.8Z" />
    <path d="M18.5 4.8a2.1 2.1 0 1 1 0 4.2h-.6v8.1a1 1 0 0 1-2 0V8.4a1 1 0 0 1 1-1h1.6a.6.6 0 1 0 0-1.2h-1.6a1 1 0 1 1 0-2h1.6Z" />
  </svg>
);
