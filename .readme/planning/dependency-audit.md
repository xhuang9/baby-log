# Dependency Audit Report

Generated from `npm run check:deps` (knip analysis).

---

## Safe to Remove (No Usage Found)

These dependencies have no imports in the actual source code:

| Package | Type | Reason |
|---------|------|--------|
| `@base-ui-components/react` | dependency | No imports found in any source file |
| `date-fns-tz` | dependency | No imports found - timezone handling not implemented |
| `vaul` | dependency | No imports found - drawer component not used |
| `@next/third-parties` | devDependency | No imports found - Google/analytics integration not implemented |
| `msw` | devDependency | No imports found - Mock Service Worker not set up |
| `whatwg-fetch` | devDependency | No imports found - fetch polyfill not needed |

**Action:** Remove these 6 packages.

---

## Keep (Confirmed Usage)

| Package | Type | Used In |
|---------|------|---------|
| `@radix-ui/react-dialog` | dependency | `src/components/ui/dialog.tsx` |
| `react-day-picker` | dependency | `src/components/ui/calendar.tsx` |
| `zod` | dependency | `src/validations/*.ts`, `src/lib/env.ts` |
| `playwright` | dependency | E2E tests via `@playwright/test` (15+ files) |

---

## Questions for You

### 1. `@radix-ui/react-slot`
**Status:** Listed as unused, but Slot pattern is used in `input-otp.tsx`

The import comes from `input-otp` package, not directly from `@radix-ui/react-slot`. However, this may be a transitive dependency required by other Radix components.

**Question:** Should I remove it and see if build breaks, or keep it as a safety measure?

- [ ] Remove and test
- [ ] Keep (safer)

---

### 2. `server-only`
**Status:** No direct imports found in source files

This package is typically used to mark server-only code in Next.js App Router. It may have been planned but not implemented.

**Question:** Are there any server actions or server components that should use `server-only`?

- [ ] Remove (not needed)
- [ ] Keep (will implement later)

---

### 3. `recharts`
**Status:** Only referenced in `.readme/planning/07-insights-dashboard.md`

This appears to be planned for a future insights/analytics dashboard feature.

**Question:** Is the insights dashboard still planned?

- [ ] Remove (not implementing soon)
- [ ] Keep (implementing soon)

---

### 4. `happy-dom`
**Status:** Listed as unused devDependency

Previously used for Vitest DOM testing, but current config uses `@vitest/browser-playwright` instead. May no longer be needed.

**Question:** Is happy-dom still needed for any test configuration?

- [ ] Remove
- [ ] Keep

---

### 5. `workbox-precaching`
**Status:** Referenced in `next.config.ts` via Serwist PWA

This is used by the PWA/service worker setup through Serwist. Knip may not recognize the indirect usage.

**Question:** Confirm this is needed for PWA functionality?

- [ ] Remove (PWA not using it)
- [ ] Keep (PWA requires it)

---

## Unlisted Dependencies (Need to Add)

These are used but not in package.json - likely installed as transitive deps:

| Package | Usage |
|---------|-------|
| `@vitest/coverage-v8` | Test coverage (if using coverage) |
| `eslint-plugin-perfectionist` | ESLint config |
| `eslint-plugin-playwright` | ESLint config |
| `eslint-plugin-react-web-api` | ESLint config |
| `eslint-plugin-tailwindcss` | ESLint config |

**Action:** Add these as devDependencies if they're directly configured (not transitive).

---

## Knip Config Updates

Remove from `ignoreDependencies` in `knip.config.ts`:
- `@commitlint/types`
- `@clerk/types`
- `vite`

These are either properly detected now or no longer needed.

---

## Unused Files

155 unused files detected, mostly in:
- `.readme/resource/baby-tracking-app/` - Reference template files

**Question:** Should the `.readme/resource/` directory be deleted or kept for reference?

- [ ] Delete (no longer needed)
- [ ] Keep (useful reference)
- [ ] Move to separate branch/location

---

## Unused Exports

Many types are exported but not imported. These are likely:
1. Public API types for future use
2. Types for consumers of the codebase

**Recommendation:** Keep most exported types - they provide good TypeScript contracts.

---

## Summary of Recommended Actions

### Immediate (Safe):
```bash
pnpm remove @base-ui-components/react date-fns-tz vaul @next/third-parties msw whatwg-fetch
```

### After Your Answers:
- Potentially remove: `@radix-ui/react-slot`, `server-only`, `recharts`, `happy-dom`
- Add missing: ESLint plugins (if directly configured)
- Update: `knip.config.ts` ignoreDependencies
