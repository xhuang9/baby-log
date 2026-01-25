import type { ComponentProps } from 'react';

export const GrowthIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M9 7.2a1 1 0 0 1 1 1v1.1a1 1 0 0 1-2 0V8.2a1 1 0 0 1 1-1Zm0 4a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1Zm0 4a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1Zm4-8a1 1 0 0 1 1 1v1.8a1 1 0 1 1-2 0V8.2a1 1 0 0 1 1-1Zm0 5a1 1 0 0 1 1 1v1.8a1 1 0 1 1-2 0v-1.8a1 1 0 0 1 1-1Z" />
  </svg>
);
