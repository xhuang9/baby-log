import type { ComponentProps } from 'react';

export const FeedIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M10 2c-.55 0-1 .45-1 1v2.2c0 .27.11.52.29.71l.51.51-3.3 3.3A4 4 0 0 0 5 12.54V19a3 3 0 0 0 3 3h5a3 3 0 0 0 3-3v-6.46a4 4 0 0 0-1.2-2.83l-3.3-3.3.51-.51c.18-.19.29-.44.29-.71V3c0-.55-.45-1-1-1h-2Zm.75 10.5a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 0 1.5h-2.5Z" />
  </svg>
);
