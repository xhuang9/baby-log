# Clerk auth layout pattern (this repo)

## Current setup
- ClerkProvider is scoped to `src/app/[locale]/(auth)/layout.tsx` (marketing pages under `(marketing)` do not load Clerk).
- Route protection is enforced in the request pipeline (`src/proxy.ts`) for `/dashboard(.*)` and `/:locale/dashboard(.*)` and runs Clerk middleware only for auth/protected routes.
- Sign-in / sign-up pages are optional catch-all routes so Clerk can handle sub-paths (MFA, SSO callbacks).
- Locale-aware auth URLs are computed in the `(auth)` layout and via `getI18nPath()` for Clerk components (`/sign-in` vs `/fr/sign-in`).

## Key files
- Request pipeline + protection rules: `src/proxy.ts`
  ```ts
  const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/:locale/dashboard(.*)',
  ]);

  const isAuthPage = createRouteMatcher([
    '/sign-in(.*)',
    '/:locale/sign-in(.*)',
    '/sign-up(.*)',
    '/:locale/sign-up(.*)',
  ]);

  if (isAuthPage(request) || isProtectedRoute(request)) {
    return clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        const locale = req.nextUrl.pathname.match(/(\\/.*)\\/dashboard/)?.at(1) ?? '';
        await auth.protect({ unauthenticatedUrl: new URL(`${locale}/sign-in`, req.url).toString() });
      }
      return handleI18nRouting(req);
    })(request, event);
  }
  ```
- ClerkProvider wrapper + locale-aware URLs: `src/app/[locale]/(auth)/layout.tsx`
  ```tsx
  const clerkLocale = ClerkLocalizations.supportedLocales[locale]
    ?? ClerkLocalizations.defaultLocale;

  let signInUrl = '/sign-in';
  let signUpUrl = '/sign-up';
  let dashboardUrl = '/dashboard';
  let afterSignOutUrl = '/';

  if (locale !== routing.defaultLocale) {
    signInUrl = `/${locale}${signInUrl}`;
    signUpUrl = `/${locale}${signUpUrl}`;
    dashboardUrl = `/${locale}${dashboardUrl}`;
    afterSignOutUrl = `/${locale}${afterSignOutUrl}`;
  }

  return (
    <ClerkProvider
      appearance={{ cssLayerName: 'clerk' }}
      localization={clerkLocale}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={dashboardUrl}
      signUpFallbackRedirectUrl={dashboardUrl}
      afterSignOutUrl={afterSignOutUrl}
    >
      {props.children}
    </ClerkProvider>
  );
  ```
- Sign-in page (optional catch-all): `src/app/[locale]/(auth)/(center)/sign-in/[[...sign-in]]/page.tsx`
  ```tsx
  setRequestLocale(locale);
  return <SignIn path={getI18nPath('/sign-in', locale)} />;
  ```
- Sign-up page (optional catch-all): `src/app/[locale]/(auth)/(center)/sign-up/[[...sign-up]]/page.tsx`
  ```tsx
  return <SignUp path={getI18nPath('/sign-up', locale)} />;
  ```
- Locale path helper (default locale has no prefix): `src/utils/Helpers.ts`
  ```ts
  export const getI18nPath = (url: string, locale: string) => {
    if (locale === routing.defaultLocale) return url;
    return `/${locale}${url}`;
  };
  ```
- Server-side user access example: `src/components/Hello.tsx`
  ```tsx
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  ```
- Dashboard sign-out UI: `src/app/[locale]/(auth)/dashboard/layout.tsx`
  ```tsx
  <SignOutButton>
    <button type="button">Sign out</button>
  </SignOutButton>
  ```
- Clerk hosted profile page: `src/app/[locale]/(auth)/dashboard/user-profile/[[...user-profile]]/page.tsx`
  ```tsx
  <UserProfile path={getI18nPath('/dashboard/user-profile', locale)} />
  ```
- Clerk localization mapping: `src/utils/AppConfig.ts`
  ```ts
  export const ClerkLocalizations = {
    defaultLocale: enUS,
    supportedLocales: { en: enUS, fr: frFR },
  };
  ```

## How to use
- Link users to sign-in/sign-up from public pages: `src/app/[locale]/(marketing)/layout.tsx`
  ```tsx
  <Link href="/sign-in/">Sign in</Link>
  <Link href="/sign-up/">Sign up</Link>
  ```
- Protect a server route handler (API): use `auth()` from `@clerk/nextjs/server`
  ```ts
  import { auth } from '@clerk/nextjs/server';

  export async function GET() {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });
    return new Response('OK');
  }
  ```
- Read the current user (server component): use `currentUser()`
  ```tsx
  import { currentUser } from '@clerk/nextjs/server';

  export async function UserEmail() {
    const user = await currentUser();
    return <span>{user?.primaryEmailAddress?.emailAddress ?? ''}</span>;
  }
  ```
- Use Clerk UI components (client): `SignOutButton`, `UserProfile`
  ```tsx
  import { SignOutButton } from '@clerk/nextjs';
  // Must render under `src/app/[locale]/(auth)/...` so ClerkProvider is present.
  ```
- If you need Clerk client hooks (`useUser`, `useAuth`), create a client component under `src/app/[locale]/(auth)/...`:
  ```tsx
  'use client';
  import { useUser } from '@clerk/nextjs';

  export function Avatar() {
    const { user } = useUser();
    return <img alt="" src={user?.imageUrl} />;
  }
  ```

## Required env vars
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client)
- `CLERK_SECRET_KEY` (server)

## Resources
- https://clerk.com/docs/nextjs
- https://clerk.com/docs/references/nextjs/clerk-middleware
- https://clerk.com/docs/references/nextjs/auth
