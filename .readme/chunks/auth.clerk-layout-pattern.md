---
last_verified_at: 2026-01-05T10:30:00Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/layout.tsx
  - src/config/app.ts
---

# Clerk Authentication Layout Pattern

## Purpose
Scopes ClerkProvider to authenticated routes using route groups for optimal code splitting and security.

## Key Deviations from Standard
- ClerkProvider NOT in root layout (unusual for Clerk)
- Scoped to `(auth)` route group only
- Reduces bundle size for public pages
- Locale-aware URL configuration calculated per request

## Layout Hierarchy

### Level 1: Root Layout
**File:** `src/app/[locale]/layout.tsx`
- NextIntlClientProvider (i18n)
- PostHogProvider (analytics)
- NO ClerkProvider

Public pages don't load Clerk JavaScript.

### Level 2: Auth Layout
**File:** `src/app/[locale]/(auth)/layout.tsx`
- ClerkProvider with locale-specific config
- Wraps all routes in `(auth)` group

```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default async function AuthLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const clerkLocale = ClerkLocalizations.supportedLocales[locale]
    ?? ClerkLocalizations.defaultLocale;

  let signInUrl = '/sign-in';
  let signUpUrl = '/sign-up';
  let postAuthUrl = '/post-auth';
  let afterSignOutUrl = '/';

  if (locale !== routing.defaultLocale) {
    signInUrl = `/${locale}${signInUrl}`;
    signUpUrl = `/${locale}${signUpUrl}`;
    postAuthUrl = `/${locale}${postAuthUrl}`;
    afterSignOutUrl = `/${locale}${afterSignOutUrl}`;
  }

  return (
    <ClerkProvider
      appearance={{
        cssLayerName: 'clerk',
      }}
      localization={clerkLocale}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={postAuthUrl}
      signUpFallbackRedirectUrl={postAuthUrl}
      afterSignOutUrl={afterSignOutUrl}
    >
      {props.children}
    </ClerkProvider>
  );
}
```

## Protected Routes

### Automatic Protection
All routes under `(auth)/` are automatically protected:
- `src/app/[locale]/(auth)/dashboard/page.tsx` - Protected
- `src/app/[locale]/(auth)/settings/page.tsx` - Protected

No manual auth checks needed in pages.

### Auth Check Example
```typescript
import { auth } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    // This won't happen - Clerk redirects to sign-in automatically
    // But useful for TypeScript type narrowing
    redirect('/sign-in');
  }

  // userId is guaranteed to exist here
  return <div>Welcome, {userId}</div>;
}
```

## URL Configuration Behavior

### English (Default Locale)
- Sign-in: `/sign-in`
- Sign-up: `/sign-up`
- After sign-in: `/post-auth` (then redirects to `/dashboard`)
- After sign-out: `/`

### Non-Default Locale (When Enabled)
- Sign-in: `/{locale}/sign-in`
- Sign-up: `/{locale}/sign-up`
- After sign-in: `/{locale}/post-auth` (then redirects to `/{locale}/dashboard`)
- After sign-out: `/{locale}`

## Important Patterns

### Accessing User Data
```typescript
import { currentUser } from '@clerk/nextjs/server';

const user = await currentUser();
// user.emailAddresses[0]?.emailAddress
// user.firstName
// user.lastName
```

### Protecting API Routes
```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // API logic
}
```

### Sign Out
```typescript
import { SignOutButton } from '@clerk/nextjs';

<SignOutButton />
// Redirects to afterSignOutUrl
```

## Benefits of This Pattern

1. **Code Splitting**: Public pages don't load Clerk bundle
2. **Security**: Clear separation of public/protected routes
3. **Performance**: Smaller initial bundle for marketing pages
4. **Maintainability**: Single auth configuration point
5. **Type Safety**: TypeScript knows user exists in auth routes

## Gotchas / Constraints

- Clerk hooks only work in `(auth)` route group
- Public pages can't access `useUser()` or `useAuth()`
- Middleware not used for auth (Clerk handles via layout)
- Sign-in/sign-up pages must be in `(auth)` group to access ClerkProvider
- Locale change requires full page reload for URL recalculation

## Related Systems
- `.readme/chunks/auth.post-auth-flow.md` - Post-authentication database sync and state initialization
- `.readme/chunks/architecture.route-structure.md` - Route group organization
- `.readme/chunks/auth.route-group-structure.md` - Nested route groups
- `.readme/chunks/i18n.clerk-localization.md` - Clerk locale integration
