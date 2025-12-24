# Auth Route Group Structure

## Purpose
Explains the nested route group pattern for authentication pages with different layouts.

## Key Deviations from Standard
- Uses nested route groups: `(auth)` contains `(center)`
- Allows different layouts for auth pages vs protected pages
- Sign-in/sign-up get centered layout, dashboard gets full-width layout

## Route Group Hierarchy

```
src/app/[locale]/
├── (marketing)/              # Public pages, marketing layout
│   ├── layout.tsx
│   └── page.tsx
└── (auth)/                   # Protected area, Clerk provider
    ├── layout.tsx            # ClerkProvider wrapper
    ├── dashboard/            # Full-width protected pages
    │   └── page.tsx
    └── (center)/             # Centered auth forms
        ├── layout.tsx        # Centered layout
        ├── sign-in/
        │   └── [[...sign-in]]/
        │       └── page.tsx
        └── sign-up/
            └── [[...sign-up]]/
                └── page.tsx
```

## Layout Rendering Chain

### Sign-In Page
1. `app/[locale]/layout.tsx` - Root (PostHog, i18n)
2. `app/[locale]/(auth)/layout.tsx` - ClerkProvider
3. `app/[locale]/(auth)/(center)/layout.tsx` - Centered container
4. `app/[locale]/(auth)/(center)/sign-in/[[...sign-in]]/page.tsx`

### Dashboard Page
1. `app/[locale]/layout.tsx` - Root (PostHog, i18n)
2. `app/[locale]/(auth)/layout.tsx` - ClerkProvider
3. `app/[locale]/(auth)/dashboard/page.tsx` (no center layout)

## Centered Layout Implementation

### File: `src/app/[locale]/(auth)/(center)/layout.tsx`
```typescript
export default function CenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  );
}
```

Simple centered container for auth forms.

## Catch-All Routes for Clerk

### Sign-In Route: `sign-in/[[...sign-in]]/page.tsx`
```typescript
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return <SignIn />;
}
```

**Why `[[...sign-in]]`?**
- Double brackets: optional catch-all
- Matches: `/sign-in`, `/sign-in/factor-one`, `/sign-in/sso-callback`
- Clerk uses sub-paths for multi-factor auth, OAuth callbacks, etc.

## Important Patterns

### Adding New Centered Auth Page
Create under `(center)/`:
```
src/app/[locale]/(auth)/(center)/forgot-password/page.tsx
```

Automatically gets:
- ClerkProvider from `(auth)` layout
- Centered styling from `(center)` layout

### Adding New Full-Width Protected Page
Create under `(auth)/` (not `(center)`):
```
src/app/[locale]/(auth)/settings/page.tsx
```

Gets:
- ClerkProvider from `(auth)` layout
- NO centering (full-width)

## Route Group Rules

### Route Groups DON'T Affect URLs
- Route: `(auth)/dashboard/page.tsx`
- URL: `/dashboard` (not `/auth/dashboard`)

- Route: `(auth)/(center)/sign-in/[[...sign-in]]/page.tsx`
- URL: `/sign-in` (not `/auth/center/sign-in`)

### Route Groups DO Affect Layouts
- Nested route groups = nested layouts
- Each route group can have its own `layout.tsx`
- Layouts compose from root to leaf

## Gotchas / Constraints

- Route group names in parentheses: `(auth)` not `auth`
- Can't have page.tsx at route group level (only layout.tsx)
- Optional catch-all requires double brackets: `[[...slug]]`
- Nested route groups multiply layout renders (performance consideration)
- Moving pages between route groups changes their layout

## Related Systems
- `.readme/chunks/architecture.route-structure.md` - Overall route organization
- `.readme/chunks/auth.clerk-layout-pattern.md` - ClerkProvider scoping
- `.readme/chunks/auth.tailwind-compatibility.md` - Styling Clerk components
