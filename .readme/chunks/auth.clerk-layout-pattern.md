---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/layout.tsx
  - src/config/app.ts
  - src/lib/clerk-theme.ts
---

# Clerk Authentication Layout Pattern

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Scope ClerkProvider to authenticated routes with locale-aware URLs and a shared appearance theme.

## Key Deviations from Standard

- **Scoped provider**: ClerkProvider lives only in `src/app/[locale]/(auth)/layout.tsx`, not the root layout.
- **Bootstrap redirect**: Sign-in/up fallback redirects target `/account/bootstrap` instead of a generic dashboard.

## Architecture / Implementation

### Components
- `src/app/[locale]/layout.tsx` - Root layout without ClerkProvider.
- `src/app/[locale]/(auth)/layout.tsx` - ClerkProvider with locale-based URLs and appearance.
- `src/config/app.ts` - App name and Clerk localization resources.
- `src/lib/clerk-theme.ts` - `clerkAppearance` theme using shadcn base and CSS variables.

### Data Flow
1. Root layout sets locale and providers for all routes.
2. Auth layout determines `clerkLocale` and URL prefixes per locale.
3. ClerkProvider renders auth routes with `clerkAppearance` styling.

### Code Pattern
```tsx
const clerkLocale = ClerkLocalizations.supportedLocales[locale]
  ?? ClerkLocalizations.defaultLocale;

<ClerkProvider
  appearance={{ ...clerkAppearance, layout: { ...clerkAppearance.layout } }}
  localization={clerkLocale}
  signInUrl={signInUrl}
  signUpUrl={signUpUrl}
  signInFallbackRedirectUrl={accountBootstrapUrl}
  signUpFallbackRedirectUrl={accountBootstrapUrl}
  afterSignOutUrl={afterSignOutUrl}
>
  {props.children}
</ClerkProvider>
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `signInUrl` | `/sign-in` | Localized sign-in URL when locale is not default.
| `signUpUrl` | `/sign-up` | Localized sign-up URL when locale is not default.
| `accountBootstrapUrl` | `/account/bootstrap` | Fallback redirect after sign-in/up.
| `afterSignOutUrl` | `/` | Redirect after sign-out, localized when needed.
| `clerkLocale` | `enUS` | Clerk localization selected from `ClerkLocalizations`.

## Gotchas / Constraints

- **Clerk hooks scope**: `useUser`, `useAuth`, etc. only work under `(auth)`.
- **Locale prefixing**: URLs are manually prefixed when `locale !== routing.defaultLocale`.

## Testing Notes

- Validate sign-in/up redirects land on `/account/bootstrap` for default and non-default locales.
- Spot-check Clerk UI uses CSS variables from `clerkAppearance`.

## Related Systems

- `.readme/chunks/auth.route-group-structure.md` - Route groups that scope Clerk.
- `.readme/chunks/i18n.clerk-localization.md` - Locale selection for Clerk.
