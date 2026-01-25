import type { ComponentProps } from 'react';

export const MedicineIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M8.1 20.3a5.8 5.8 0 0 1 0-8.2l3-3a5.8 5.8 0 0 1 8.2 8.2l-3 3a5.8 5.8 0 0 1-8.2 0Z" />
    <path d="M10.7 10.7l6.6 6.6a1 1 0 0 1-1.4 1.4l-6.6-6.6a1 1 0 0 1 1.4-1.4Z" />
  </svg>
);
