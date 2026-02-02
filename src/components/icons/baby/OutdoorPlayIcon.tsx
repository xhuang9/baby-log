import type { ComponentProps } from 'react';

export const OutdoorPlayIcon = ({ className, width = 32, height = 32, ...props }: ComponentProps<'svg'>) => (
  <svg
    {...props}
    width={width}
    height={height}
    className={['fill-current', className].filter(Boolean).join(' ')}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M6.5 4A2.5 2.5 0 0 1 9 6.5V7h6v-.5A2.5 2.5 0 0 1 17.5 4h.2A1.3 1.3 0 0 1 19 5.3V9a1 1 0 0 1-2 0V7.2a.2.2 0 0 0-.2-.2h-.1a.5.5 0 0 0-.5.5V18a1 1 0 0 1-2 0v-3H9v3a1 1 0 0 1-2 0V7.5A.5.5 0 0 0 6.5 7h-.1a.2.2 0 0 0-.2.2V9a1 1 0 0 1-2 0V5.3A1.3 1.3 0 0 1 5.5 4h1Z" />
    <path d="M14.8 12h4.7a1 1 0 0 1 .8 1.6l-4.2 5.6a1.6 1.6 0 0 1-1.28.64H11a1 1 0 1 1 0-2h3.7l3.1-4.1h-3a1 1 0 1 1 0-2Z" />
  </svg>
);
