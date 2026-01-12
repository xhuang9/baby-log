---
last_verified_at: 2026-01-11T00:00:00Z
source_paths:
  - src/lib/Env.ts
  - src/config/app.ts
  - next.config.ts
---

# Key Integration Points

## Sentry Setup
- Local: Spotlight runs automatically on `npm run dev` at port 8969
- Production: Requires `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` env vars
- Config: Wrapped in `next.config.ts` with tunnel route `/monitoring`

## Clerk Authentication
- Must set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Get keys from Clerk Dashboard after creating application
- Localization configured via `src/config/app.ts` ClerkLocalizations

## Database Connection
- Default: Temporary Neon PostgreSQL (72h expiration)
- Persist: Run `npm run neon:claim` to make permanent
- Fresh DB: Delete `DATABASE_URL` and `DATABASE_URL_DIRECT` from `.env.local`, restart dev server
- Schema source of truth: `src/models/Schema.ts`

## CI/CD
- GitHub Actions: Semantic Release on main branch for automatic versioning
- Playwright runs in CI with both Chromium and Firefox
- Crowdin syncs translations automatically on main branch commits
- CodeRabbit provides AI-powered code reviews on pull requests
