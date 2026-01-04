# Auth route groups and layouts (this repo)

## Current setup
- `(auth)` route group applies `ClerkProvider`.
- Nested `(auth)/(center)` route group applies a centered layout for auth forms.
- Catch-all routes `[[...sign-in]]` / `[[...sign-up]]` are used so Clerk can render MFA/OAuth sub-paths.

## Key files
- Auth group layout: `src/app/[locale]/(auth)/layout.tsx`
  ```tsx
  export default async function AuthLayout({ children, params }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <ClerkProvider>{children}</ClerkProvider>;
  }
  ```
- Centered auth layout: `src/app/[locale]/(auth)/(center)/layout.tsx`
  ```tsx
  export default async function CenteredLayout({ children, params }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <div className="flex min-h-screen items-center justify-center">{children}</div>;
  }
  ```
- Sign-in catch-all: `src/app/[locale]/(auth)/(center)/sign-in/[[...sign-in]]/page.tsx`
  ```tsx
  export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <SignIn path={getI18nPath('/sign-in', locale)} />;
  }
  ```
- Sign-up catch-all: `src/app/[locale]/(auth)/(center)/sign-up/[[...sign-up]]/page.tsx`
  ```tsx
  return <SignUp path={getI18nPath('/sign-up', locale)} />;
  ```

## How to use
- Protected page (full width): `src/app/[locale]/(auth)/<page>/page.tsx`
- Centered auth page: `src/app/[locale]/(auth)/(center)/<page>/page.tsx`
  ```text
  (auth)/<page>          -> uses ClerkProvider, normal layout
  (auth)/(center)/<page> -> uses ClerkProvider + centered container
  ```

## Resources
- https://nextjs.org/docs/app/building-your-application/routing/route-groups
- https://clerk.com/docs
