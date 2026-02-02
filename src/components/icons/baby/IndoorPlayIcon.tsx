import type { ComponentProps } from 'react';

export const IndoorPlay = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M7 9a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1H7V9Z" />
    <path d="M5.5 10.2h13c.83 0 1.5.67 1.5 1.5v6.8A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-6.8c0-.83.67-1.5 1.5-1.5Z" />
    <path d="M9 5.1a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm6 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" />
  </svg>
);
