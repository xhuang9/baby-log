# PGlite local database (this repo)

## Current setup
- PGlite can run Postgres locally without an external DB.
- Two modes:
  - file-based: `npm run db-server:file` (persists to `local.db`)
  - in-memory: `npm run db-server:memory` (used for `build-local` and Playwright)

## Key files
- Scripts: `package.json` (`db-server:file`, `db-server:memory`, `build-local`)
  ```json
  {
    "scripts": {
      "db-server:file": "pglite-server --db=local.db --run 'npm run db:migrate'",
      "db-server:memory": "pglite-server --run 'npm run db:migrate'",
      "build-local": "run-p db-server:memory build:next --race"
    }
  }
  ```
- Playwright server command uses PGlite memory: `playwright.config.ts`
  ```ts
  webServer: {
    command: process.env.CI
      ? 'npx run-p db-server:memory start'
      : 'npx run-p db-server:memory dev:next',
  }
  ```

## How to use
- Start file-based DB: `npm run db-server:file`
- Point app to it (example): `DATABASE_URL=postgresql://localhost:5432/pglite npm run dev:next`
- Build with in-memory DB: `npm run build-local`
  ```bash
  npm run db-server:file
  DATABASE_URL=postgresql://localhost:5432/pglite npm run dev:next
  ```

## Resources
- https://pglite.dev/
- https://github.com/electric-sql/pglite
