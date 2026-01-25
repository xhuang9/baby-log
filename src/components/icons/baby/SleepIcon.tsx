import type { ComponentProps } from 'react';

export const SleepIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M10.2 3.6a1 1 0 0 1 .9 1.55A6.5 6.5 0 1 0 18.85 13a1 1 0 0 1 1.55.9A8.5 8.5 0 1 1 10.2 3.6Z" />
    <path d="M16.5 4.2h4a.8.8 0 0 1 .6 1.34l-2.35 2.66h1.75a.8.8 0 0 1 .6 1.34l-3 3.4a.8.8 0 1 1-1.2-1.06l1.95-2.2H17.1a.8.8 0 0 1-.6-1.34l2.35-2.66H16.5a.8.8 0 0 1 0-1.6Z" />
  </svg>
);
