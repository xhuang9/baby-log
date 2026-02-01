'use client';

import NextError from 'next/error';
import { useEffect } from 'react';
import { routing } from '@/lib/i18n/routing';

export default function GlobalError(props: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Dynamically import Sentry only when needed
    if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(props.error);
      }).catch(() => {
        // Sentry not available, log to console instead
        console.error('Global error:', props.error);
      });
    } else {
      console.error('Global error:', props.error);
    }
  }, [props.error]);

  return (
    <html lang={routing.defaultLocale}>
      <body>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
