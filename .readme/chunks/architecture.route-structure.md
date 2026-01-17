---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/layout.tsx
  - src/app/[locale]/(marketing)/layout.tsx
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
---

# Route Structure & Route Groups

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Define a locale-first App Router structure with distinct marketing and authenticated layouts, while keeping required global routes at the root.

## Key Deviations from Standard

- **Locale-first routing**: Most pages live under `src/app/[locale]/` and require a locale segment.
- **Root-only special routes**: `global-error.tsx`, `robots.ts`, and `sitemap.ts` live outside `[locale]` because Next.js requires them at the app root.

## Architecture / Implementation

### Components
- `src/app/[locale]/layout.tsx` - Root layout with `ThemeProvider`, `NextIntlClientProvider`, and request locale validation.
- `src/app/[locale]/(marketing)/layout.tsx` - Public layout with `BaseTemplate` and navigation.
- `src/app/[locale]/(auth)/layout.tsx` - ClerkProvider scope and localized auth URLs.
- `src/app/[locale]/(auth)/(center)/layout.tsx` - Centered layout for auth forms.

### Data Flow
1. Root layout validates the locale and calls `setRequestLocale`.
2. Marketing or auth layouts nest under the root based on route group.
3. Auth layout configures Clerk URLs based on locale.

### Code Pattern
```tsx
if (!hasLocale(routing.locales, locale)) {
  notFound();
}
setRequestLocale(locale);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `signInUrl` | `/sign-in` | Clerk sign-in entry; prefixed with `/${locale}` when not default.
| `signUpUrl` | `/sign-up` | Clerk sign-up entry; prefixed with `/${locale}` when not default.
| `accountBootstrapUrl` | `/account/bootstrap` | Post-auth bootstrap route used for sign-in/up fallback redirects.
| `afterSignOutUrl` | `/` | Post sign-out redirect, localized when needed.

## Gotchas / Constraints

- **Root-only files**: `global-error.tsx`, `robots.ts`, and `sitemap.ts` must stay at the app root.
- **Locale validation**: `setRequestLocale` must be called in each layout that handles locale.

## Testing Notes

- Hit `/robots.txt` and `/sitemap.xml` to confirm root routes are served.
- Verify non-default locales generate localized Clerk URLs in auth flows.

## Related Systems

- `.readme/chunks/i18n.routing-integration.md` - Locale routing and navigation helpers.
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk provider configuration details.
