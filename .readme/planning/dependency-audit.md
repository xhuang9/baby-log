# Dependency Audit Report

Generated from `npm run check:deps` (knip analysis).

**Status: COMPLETED** - 2025-01-31

---

## Packages Removed

```bash
pnpm remove @hookform/resolvers react-hook-form date-fns @faker-js/faker
```

| Package | Reason |
|---------|--------|
| `@hookform/resolvers` | No react-hook-form usage found |
| `react-hook-form` | Not used anywhere in codebase |
| `date-fns` | Only referenced in planning docs, not actual code |
| `@faker-js/faker` | Not used in any tests |

---

## Kept Packages (Confirmed Usage)

| Package | Reason |
|---------|--------|
| `@base-ui/react` | Used by 26+ shadcn UI components |
| `@radix-ui/react-dialog` | Used in `src/components/ui/dialog.tsx` |
| `@radix-ui/react-slot` | Used by shadcn/Radix components |
| `@logtape/logtape` | Used in `src/lib/logger.ts` |
| `react-day-picker` | Used in `src/components/ui/calendar.tsx` |
| `zod` | Used in validations and env config |
| `playwright` | E2E tests (15+ files) |
| `recharts` | Planned for insights dashboard |
| `happy-dom` | May be needed for e2e tests |
| `workbox-precaching` | Required for PWA |
| `import-in-the-middle` | Sentry peer dependency |
| `require-in-the-middle` | Sentry peer dependency |
| `@babel/core` | React Compiler |
| `@babel/preset-env` | React Compiler |
| `babel-loader` | React Compiler |
| `lefthook` | Git hooks (lefthook.yml) |

---

## Knip Config Updated

Updated `knip.config.ts` to ignore false positives for packages that are actually used but knip can't detect (top-level await imports, re-exports, config files).

---

## Remaining Issues

### Unused Files (155)
Mostly in `.readme/resource/` - kept as LLM reference material (gitignored).

### Unused Exports (226)
Type exports for API contracts - kept for TypeScript interfaces.
