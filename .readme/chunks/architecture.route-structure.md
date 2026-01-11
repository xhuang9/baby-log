---
last_verified_at: 2026-01-10T00:00:00Z
source_paths:
  - src/app/[locale]/layout.tsx
  - src/app/[locale]/(marketing)/layout.tsx
  - src/app/[locale]/(auth)/layout.tsx
  - src/app/[locale]/(auth)/(center)/layout.tsx
---

# Route Structure & Route Groups

## Purpose
This boilerplate uses a highly organized route structure with route groups to separate concerns and apply different layouts.

## Key Deviations from Standard
- All routes are under `src/app/[locale]/` - no routes exist outside this directory
- Uses three nested route groups: `(marketing)`, `(auth)`, and `(auth)/(center)`
- Route groups don't affect URL structure but control layout boundaries
- `[locale]` segment is required for ALL routes (locale-aware by default)
- Marketing pages have been stripped down to minimal home page only

## Route Organization

### Top Level: `src/app/[locale]/`
- `layout.tsx` - Root layout with locale validation, metadata, providers
- `(marketing)/` - Public pages with marketing layout (minimal, home page only)
- `(auth)/` - Protected pages with Clerk authentication
- `api/` - API routes (also locale-prefixed)

### Marketing Route Group: `(marketing)/`
- Purpose: Public-facing pages
- Layout: `layout.tsx` provides navigation with sign-in/sign-up links
- Pages: Only home page (`page.tsx`) - about/portfolio/counter pages removed
- No authentication required

### Auth Route Group: `(auth)/`
- Purpose: Protected pages requiring authentication
- Layout: `layout.tsx` wraps children in `ClerkProvider` with locale-aware URLs
- Contains dashboard and nested `(center)` group
- All pages automatically protected by Clerk

### Centered Auth Route Group: `(auth)/(center)/`
- Purpose: Authentication UI pages that need centered layout
- Contains: `sign-in/[[...sign-in]]/`, `sign-up/[[...sign-up]]/`
- Catch-all routes (`[[...sign-in]]`) allow Clerk to handle sub-paths
- Layout applies centered styling for auth forms

## Important Patterns

### Creating New Pages

**Marketing page:**
```
src/app/[locale]/(marketing)/my-page/page.tsx
```
Automatically gets marketing layout and locale routing.

**Protected page:**
```
src/app/[locale]/(auth)/my-protected/page.tsx
```
Automatically gets Clerk protection and auth layout.

### Layout Composition
Layouts nest from root → route group → page:
1. `src/app/[locale]/layout.tsx` (providers, locale validation)
2. `src/app/[locale]/(auth)/layout.tsx` (ClerkProvider)
3. `src/app/[locale]/(auth)/(center)/layout.tsx` (centered styling)
4. Page component

## Gotchas / Constraints

- Never create routes outside `[locale]` - breaks i18n
- Route groups use parentheses: `(marketing)` not `marketing`
- Clerk catch-all routes must use double brackets: `[[...sign-in]]`
- API routes are also locale-prefixed: `/en/api/counter`
- Root `layout.tsx` MUST call `setRequestLocale(locale)` for static rendering

## Related Systems
- `.readme/chunks/i18n.routing-integration.md` - How locale routing works
- `.readme/chunks/auth.clerk-layout-pattern.md` - ClerkProvider scoping
