---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - package.json
  - playwright.config.ts
---

# PGlite Local Database

## Purpose
Provides local PostgreSQL-compatible database for development without external dependencies or network access.

## Key Deviations from Standard
- Uses PGlite (WASM PostgreSQL) instead of traditional PostgreSQL server
- Two modes: file-based (persistent) and in-memory (temporary)
- Perfect for offline development, CI/CD, or testing
- 100% PostgreSQL compatible at SQL level

## PGlite Modes

### File-Based Mode: `npm run db-server:file`
```bash
pglite-server --db=local.db --run 'npm run db:migrate'
```

Characteristics:
- Persists data to `local.db` file
- Data survives server restarts
- Runs migrations automatically on start
- Suitable for local development

### In-Memory Mode: `npm run db-server:memory`
```bash
pglite-server --run 'npm run db:migrate'
```

Characteristics:
- All data in memory (RAM)
- Data lost on server stop
- Fast for testing
- Used by `build-local` and Playwright tests

## When to Use PGlite

### Use Cases
- **Offline Development**: No internet connection required
- **CI/CD Testing**: Fast, isolated test databases
- **Build Testing**: `npm run build-local` uses in-memory PGlite
- **E2E Tests**: Playwright tests run against in-memory database
- **Privacy**: No external service, all local

### Don't Use For
- Production deployments
- Shared development environment
- Large datasets (>1GB)
- High concurrency testing

## npm Script Integration

### Development with PGlite
Not run by default - manual invocation:
```bash
npm run db-server:file
# Start file-based PGlite and keep dev server separate
```

### Build Testing
```bash
npm run build-local
# Uses in-memory PGlite via: run-p db-server:memory build:next --race
```

Runs both commands in parallel, racing to completion.

### E2E Testing (Playwright)
```bash
npm run test:e2e
# playwright.config.ts starts: npx run-p db-server:memory dev:next
```

## Important Patterns

### PGlite Server Commands
```bash
# File-based with migrations
pglite-server --db=local.db --run 'npm run db:migrate'

# In-memory with migrations
pglite-server --run 'npm run db:migrate'

# Custom port
pglite-server --port 5433

# Custom host
pglite-server --host 0.0.0.0
```

### Connection String
PGlite server provides standard PostgreSQL connection:
```
DATABASE_URL=postgresql://localhost:5432/pglite
```

Set in environment or `.env.local` to use PGlite instead of Neon.

## Switching Between Neon and PGlite

### Use Neon (Default)
```bash
npm run dev
# Provisions Neon database automatically
```

### Use PGlite
```bash
# Terminal 1: Start PGlite server
npm run db-server:file

# Terminal 2: Set connection and start Next.js
DATABASE_URL=postgresql://localhost:5432/pglite npm run dev:next
```

Or add to `.env.local`:
```
DATABASE_URL=postgresql://localhost:5432/pglite
```

## Gotchas / Constraints

- In-memory mode loses all data on stop
- File-based mode creates `local.db` in project root (gitignored)
- PGlite is single-user (no concurrent connections from multiple machines)
- Some advanced PostgreSQL features may not work
- Performance slower than native PostgreSQL for large operations
- WASM overhead makes it unsuitable for production

## Related Systems
- `.readme/chunks/database.neon-integration.md` - Cloud database alternative
- `.readme/chunks/testing.playwright-e2e.md` - How E2E tests use PGlite
