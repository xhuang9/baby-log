'use client';

import type { ComponentProps } from 'react';
import NextLink from 'next/link';

type Props = ComponentProps<typeof NextLink>;

/**
 * Link that falls back to full page navigation when offline.
 * Prevents RSC fetch failures during client-side navigation.
 *
 * When online: behaves exactly like Next.js Link (client-side navigation)
 * When offline: triggers full page navigation to leverage cached HTML
 */
export function OfflineLink({ href, onClick, children, ...props }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call original onClick if provided
    onClick?.(e);

    // If offline, prevent client navigation and do full page nav
    if (!navigator.onLine && !e.defaultPrevented) {
      e.preventDefault();
      const url = typeof href === 'string' ? href : href.pathname || '/';
      window.location.href = url;
    }
  };

  return (
    <NextLink href={href} onClick={handleClick} {...props}>
      {children}
    </NextLink>
  );
}
