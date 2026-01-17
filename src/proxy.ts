import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@arcjet/next';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import arcjet from '@/lib/arcjet';
import { routing } from './lib/i18n-routing';

const handleI18nRouting = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  // Bootstrap flow - requires auth to get initial data
  '/account(.*)',
  '/:locale/account(.*)',

  // API routes - data access requires auth
  '/api/bootstrap(.*)',
  '/:locale/api/bootstrap(.*)',
  '/api/sync(.*)',
  '/:locale/api/sync(.*)',
]);

// Dashboard routes - NO Clerk middleware at all
// These pages render client-side from IndexedDB, no server auth needed
// Removed from Clerk processing to enable offline support

const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/:locale/sign-in(.*)',
  '/sign-up(.*)',
  '/:locale/sign-up(.*)',
]);

// Improve security with Arcjet
const aj = arcjet.withRule(
  detectBot({
    mode: 'LIVE',
    // Block all bots except the following
    allow: [
      // See https://docs.arcjet.com/bot-protection/identifying-bots
      'CATEGORY:SEARCH_ENGINE', // Allow search engines
      'CATEGORY:PREVIEW', // Allow preview links to show OG images
      'CATEGORY:MONITOR', // Allow uptime monitoring services
    ],
  }),
);

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  // Verify the request with Arcjet
  // Use `process.env` instead of Env to reduce bundle size in middleware
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Clerk keyless mode doesn't work with i18n, this is why we need to run the middleware conditionally
  // Run Clerk ONLY for: auth pages and protected routes (API, bootstrap)
  // Dashboard pages skip Clerk entirely to enable offline support
  if (isAuthPage(request) || isProtectedRoute(request)) {
    return clerkMiddleware(async (auth, req) => {
      // Protect API and bootstrap routes
      if (isProtectedRoute(req)) {
        const localeSegment = req.nextUrl.pathname.split('/')[1];
        const locale = localeSegment && routing.locales.includes(localeSegment)
          ? `/${localeSegment}`
          : '';

        const signInUrl = new URL(`${locale}/sign-in`, req.url);

        await auth.protect({
          unauthenticatedUrl: signInUrl.toString(),
        });
      }

      return handleI18nRouting(req);
    })(request, event);
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next`, `/_vercel` or `monitoring`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!_next|_vercel|monitoring|.*\\..*).*)',
};
