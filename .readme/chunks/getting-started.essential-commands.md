---
last_verified_at: 2026-01-11T00:00:00Z
source_paths:
  - package.json
---

# Essential Commands

## Development
```bash
npm run dev                 # Start development server with DB migration and Spotlight
npm run dev:next            # Start Next.js dev server only
npm run dev:spotlight       # Start Sentry Spotlight for local error monitoring
```

## Database
```bash
npm run db:generate         # Generate migration from schema changes in src/models/Schema.ts
npm run db:migrate          # Apply pending migrations
npm run db:studio           # Open Drizzle Studio at https://local.drizzle.studio
npm run db-server:file      # Start local file-based PGlite server
npm run db-server:memory    # Start in-memory PGlite server (temporary)
npm run neon:claim          # Claim temporary DB to make it persistent (expires in 72h)
```

## Build & Deploy
```bash
npm run build               # Production build with remote DB
npm run build-local         # Production build with in-memory DB (testing)
npm start                   # Start production server
npm run build-stats         # Build with bundle analyzer
```

## Testing
```bash
npm run test                # Run Vitest unit tests (node + browser mode)
npm run test:e2e            # Run Playwright integration/E2E tests
```

## Code Quality
```bash
npm run lint                # Run ESLint
npm run lint:fix            # Auto-fix linting issues
npm run check:types         # TypeScript type checking
npm run check:deps          # Find unused dependencies and files (Knip)
npm run check:i18n          # Validate translations completeness
npm run commit              # Interactive conventional commit prompt
```
