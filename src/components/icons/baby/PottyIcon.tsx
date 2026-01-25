import type { ComponentProps } from 'react';

export const PottyIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M8 4h8a2 2 0 0 1 2 2v4.8c0 4.3-3.5 7.8-7.8 7.8H9.5a3.5 3.5 0 0 1-3.5-3.5V6a2 2 0 0 1 2-2Z" />
    <path d="M7.2 20.2a1.8 1.8 0 0 1 1.8-1.8h6a1.8 1.8 0 1 1 0 3.6H9a1.8 1.8 0 0 1-1.8-1.8Z" />
    <path d="M8 6.3a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z" />
  </svg>
);
