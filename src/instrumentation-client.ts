// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Add optional integrations for additional features
      integrations: [
        Sentry.replayIntegration(),
        Sentry.consoleLoggingIntegration(),
        Sentry.browserTracingIntegration(),

        ...(process.env.NODE_ENV === 'development'
          ? [Sentry.spotlightBrowserIntegration()]
          : []),
      ],

      // Adds request headers and IP for users, for more info visit
      sendDefaultPii: true,

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 1,

      // Define how likely Replay events are sampled.
      // This sets the sample rate to be 10%. You may want this to be 100% while
      // in development and sample at a lower rate in production
      replaysSessionSampleRate: 0.1,

      // Define how likely Replay events are sampled when an error occurs.
      replaysOnErrorSampleRate: 1.0,

      // Enable logs to be sent to Sentry
      enableLogs: true,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,
    });

    // Export router transition handler
    if (typeof window !== 'undefined') {
      (window as unknown as { __sentryOnRouterTransitionStart?: typeof Sentry.captureRouterTransitionStart }).__sentryOnRouterTransitionStart = Sentry.captureRouterTransitionStart;
    }
  });
}

// Queue for calls made before handler is ready
let pendingCalls: unknown[][] = [];
let hasReplayed = false;

// Replay queued calls once handler is available
function replayPendingCalls() {
  if (hasReplayed || typeof window === 'undefined') {
    return;
  }

  const handler = (window as unknown as { __sentryOnRouterTransitionStart?: (...args: unknown[]) => void }).__sentryOnRouterTransitionStart;
  if (handler && pendingCalls.length > 0) {
    hasReplayed = true;
    pendingCalls.forEach(args => handler(...args));
    pendingCalls = []; // Clear queue to free memory
  }
}

// Export placeholder for router transition that calls the actual Sentry function
export function onRouterTransitionStart(...args: unknown[]) {
  if (typeof window !== 'undefined') {
    const handler = (window as unknown as { __sentryOnRouterTransitionStart?: (...args: unknown[]) => void }).__sentryOnRouterTransitionStart;
    if (handler) {
      handler(...args);
      // Replay any pending calls that arrived before handler was ready
      replayPendingCalls();
    } else {
      // Handler not ready yet - queue the call
      pendingCalls.push(args);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Sentry] Router transition handler not ready yet, call queued for replay');
      }
      // Attempt replay shortly in case handler becomes available
      setTimeout(replayPendingCalls, 100);
    }
  }
}
