export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    const Sentry = await import('@sentry/nextjs');

    const sentryOptions: Parameters<typeof Sentry.init>[0] = {
      // Sentry DSN
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Enable Spotlight in development
      spotlight: process.env.NODE_ENV === 'development',

      integrations: [
        Sentry.consoleLoggingIntegration(),
      ],

      // Adds request headers and IP for users, for more info visit
      sendDefaultPii: true,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: 1,

      // Enable logs to be sent to Sentry
      enableLogs: true,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    };

    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // Node.js Sentry configuration
      Sentry.init(sentryOptions);
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge Sentry configuration
      Sentry.init(sentryOptions);
    }
  }
}

export async function onRequestError(
  error: Error & { digest?: string },
  request: { path: string; method: string; headers: { [key: string]: string } },
  context: { routerKind: string; routePath: string; routeType: string; revalidateReason: string | undefined },
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(error, request, context);
  }
}
