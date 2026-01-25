import type { ComponentProps } from 'react';

export const NappyIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6 6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2.2c0 .42-.26.8-.65.94l-2.35.84a3 3 0 0 1-1.02.18H10a3 3 0 0 1-1.02-.18L6.65 9.14A1 1 0 0 1 6 8.2V6Z" />
    <path d="M5 10.2c0-.7.7-1.2 1.36-.95l2.2.83A5 5 0 0 0 10.33 10h3.34a5 5 0 0 0 1.77-.32l2.2-.83c.66-.25 1.36.25 1.36.95V18a3 3 0 0 1-3 3h-1.5a2.5 2.5 0 0 1-2.03-1.04l-.47-.66-.47.66A2.5 2.5 0 0 1 9.5 21H8a3 3 0 0 1-3-3v-7.8Z" />
  </svg>
);
