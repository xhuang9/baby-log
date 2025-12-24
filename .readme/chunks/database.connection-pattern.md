# Database Connection Pattern

## Purpose
Implements a global singleton connection to prevent multiple database connections during Next.js hot-reload in development.

## Key Deviations from Standard
- Connection stored in `globalThis` during development
- Uses single connection pool with `max: 1` connections
- Connection created lazily on first import
- Production creates new connection per deployment (no global caching)

## Implementation: `src/libs/DB.ts`

```typescript
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@/models/Schema';
import { createDbConnection } from '@/utils/DBConnection';
import { Env } from './Env';

const globalForDb = globalThis as unknown as {
  drizzle: NodePgDatabase<typeof schema>;
};

const db = globalForDb.drizzle || createDbConnection();

// Only cache in development
if (Env.NODE_ENV !== 'production') {
  globalForDb.drizzle = db;
}

export { db };
```

## Connection Factory: `src/utils/DBConnection.ts`

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Env } from '@/libs/Env';
import * as schema from '@/models/Schema';

export const createDbConnection = () => {
  const pool = new Pool({
    connectionString: Env.DATABASE_URL,
    max: 1, // Single connection
  });

  return drizzle({
    client: pool,
    schema, // Enables relational queries
  });
};
```

## Why This Pattern?

### Problem: Hot Reload Connection Leak
Without this pattern:
- Each Next.js hot-reload creates new connection
- Database quickly hits max connection limit
- Development becomes unusable

### Solution: Global Singleton
- First import creates connection and caches in `globalThis`
- Subsequent hot-reloads reuse existing connection
- Connection persists across module reloads
- Production doesn't cache (stateless deployments)

## Important Patterns

### Using the Database
```typescript
import { db } from '@/libs/DB';
import { counterSchema } from '@/models/Schema';

// Simple queries
const counters = await db.select().from(counterSchema);

// With where clause
const counter = await db
  .select()
  .from(counterSchema)
  .where(eq(counterSchema.id, 1));

// Inserts
await db.insert(counterSchema).values({ count: 0 });

// Updates
await db
  .update(counterSchema)
  .set({ count: 5 })
  .where(eq(counterSchema.id, 1));
```

### Connection Pool Configuration
- `max: 1` - Single connection (sufficient for dev, serverless)
- Increase for high-traffic production if using long-running server
- `connectionString` from `DATABASE_URL` env var

## Environment-Specific Behavior

### Development
- Connection cached in `globalThis.drizzle`
- Survives hot-reloads
- Single connection shared across requests

### Production
- New connection per deployment
- No global caching (serverless compatible)
- Each function invocation may create new connection
- Connection pooling still works within single execution context

## Gotchas / Constraints

- Only works in Node.js runtime (not Edge runtime)
- Global caching means connection state persists in dev
- Must restart dev server to clear connection cache
- `max: 1` may bottleneck if many concurrent requests in dev
- Edge runtime requires different connection pattern (not supported)

## Related Systems
- `.readme/chunks/database.schema-workflow.md` - Schema and migration patterns
- `.readme/chunks/config.env-validation.md` - DATABASE_URL validation
