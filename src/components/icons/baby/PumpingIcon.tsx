import type { ComponentProps } from 'react';

export const PumpingIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M13.2 3.8a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1-1.4 1.4l-.2-.2-1.6 1.6a1 1 0 0 1-1.4-1.4l1.6-1.6-.2-.2a1 1 0 0 1 0-1.4Z" />
    <path d="M10.2 7.7a2.8 2.8 0 0 1 3.95 0l.8.8a1 1 0 0 1 0 1.4l-1.25 1.25V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3.2A5.8 5.8 0 0 1 10.2 7.7Z" />
    <path d="M6.1 12.5a1 1 0 0 1 1.1-1h3.1a1 1 0 1 1 0 2H8.2l1.2 1.2a1 1 0 0 1-1.4 1.4l-2-2a1 1 0 0 1-.3-.6Z" />
  </svg>
);
