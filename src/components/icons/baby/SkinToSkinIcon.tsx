import type { ComponentProps } from 'react';

export const SkinToSkinIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6.2 12.7v-3a1.4 1.4 0 0 1 2.8 0v2.2h.2v-3a1.4 1.4 0 0 1 2.8 0v3h.2V10a1.4 1.4 0 1 1 2.8 0v4.6c0 3.1-2.5 5.6-5.6 5.6H9.6A4.6 4.6 0 0 1 5 15.6v-1.5a1.4 1.4 0 1 1 2.8 0v1.2c0 .7.6 1.3 1.3 1.3h2.7a2.4 2.4 0 0 0 2.4-2.4v-1.5H8.6a2.4 2.4 0 0 0-2.4 2.4v-2.4Z" />
    <path d="M18.2 3.5c1.2 0 2.1.9 2.1 2.1 0 2-2.7 3.8-4.1 4.7-1.4-.9-4.1-2.7-4.1-4.7 0-1.2.9-2.1 2.1-2.1.8 0 1.5.4 2 1 .5-.6 1.2-1 2-1Z" />
  </svg>
);
