import type { ComponentProps } from 'react';

export const TummyTimeIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6.5 12.5c0-3.04 2.46-5.5 5.5-5.5h.4c3.04 0 5.5 2.46 5.5 5.5v1.1c0 2.98-2.42 5.4-5.4 5.4H11.9c-2.98 0-5.4-2.42-5.4-5.4v-1.1Z" />
    <path d="M8.2 18.6a1.8 1.8 0 0 1 1.8-1.8h4a1.8 1.8 0 1 1 0 3.6h-4a1.8 1.8 0 0 1-1.8-1.8Z" />
    <circle cx="10.3" cy="12.6" r="0.9" />
    <circle cx="13.7" cy="12.6" r="0.9" />
  </svg>
);
