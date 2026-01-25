import type { ComponentProps } from 'react';

export const BathIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6 9.5a2.5 2.5 0 0 1 2.5-2.5H10a2 2 0 0 1 4 0h1.5A2.5 2.5 0 0 1 18 9.5v1.2H6V9.5Z" />
    <path d="M4.8 11.8c0-.6.5-1.1 1.1-1.1h12.2c.6 0 1.1.5 1.1 1.1v2.2c0 2.9-2.3 5.2-5.2 5.2H10c-2.9 0-5.2-2.3-5.2-5.2v-2.2Z" />
    <path d="M7.2 20.2a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2h-.5a1 1 0 0 1-1-1Zm8.6 0a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2h-.5a1 1 0 0 1-1-1Z" />
  </svg>
);
