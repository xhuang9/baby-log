# Next.js route structure (this repo)

## Current setup
- All routes live under `src/app/[locale]/...` (there are no routes outside it).
- Route groups used for layout boundaries (they do not change the URL):
  - `src/app/[locale]/(marketing)/...` public pages
  - `src/app/[locale]/(auth)/...` authenticated pages (Clerk provider + protection)
  - `src/app/[locale]/(auth)/(center)/...` centered auth UI (sign-in/up)

## Key files
- Root layout: `src/app/[locale]/layout.tsx`
  ```tsx
  export function generateStaticParams() {
    return routing.locales.map(locale => ({ locale }));
  }

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  ```
- Marketing layout: `src/app/[locale]/(marketing)/layout.tsx`
- Auth layout (ClerkProvider): `src/app/[locale]/(auth)/layout.tsx`
- Centered auth layout: `src/app/[locale]/(auth)/(center)/layout.tsx`
- Sign-in page (catch-all): `src/app/[locale]/(auth)/(center)/sign-in/[[...sign-in]]/page.tsx`
- Sign-up page (catch-all): `src/app/[locale]/(auth)/(center)/sign-up/[[...sign-up]]/page.tsx`

## How to use
- New public page: create `src/app/[locale]/(marketing)/<page>/page.tsx`.
  ```tsx
  export default function Page() {
    return <main>Public page</main>;
  }
  ```
- New protected page: create `src/app/[locale]/(auth)/<page>/page.tsx`.
  ```tsx
  export default function Page() {
    return <main>Requires Clerk session</main>;
  }
  ```
- New centered auth page: create `src/app/[locale]/(auth)/(center)/<page>/page.tsx`.
  ```tsx
  export default function Page() {
    return <main>Centered layout</main>;
  }
  ```

## Commands
- Dev server: `npm run dev`

## Resources
- https://nextjs.org/docs/app/building-your-application/routing
- https://nextjs.org/docs/app/building-your-application/routing/route-groups
