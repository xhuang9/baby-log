# Database connection pattern (this repo)

## Current setup
- The Drizzle database client is exported from `src/libs/DB.ts`.
- In development, the connection is cached on `globalThis` to survive hot reload.
- Connection factory lives in `src/utils/DBConnection.ts` and uses `pg.Pool`.

## Key files
- DB singleton export: `src/libs/DB.ts`
  ```ts
  const globalForDb = globalThis as unknown as {
    drizzle: NodePgDatabase<typeof schema>;
  };

  const db = globalForDb.drizzle || createDbConnection();

  if (Env.NODE_ENV !== 'production') {
    globalForDb.drizzle = db;
  }

  export { db };
  ```
- Connection factory: `src/utils/DBConnection.ts`
  ```ts
  const pool = new Pool({ connectionString: Env.DATABASE_URL, max: 1 });

  return drizzle({
    client: pool,
    schema,
  });
  ```
- Required env var: `DATABASE_URL` (validated in `src/libs/Env.ts`)

## How to use
- Import the DB client: `import { db } from '@/libs/DB'`.
- Avoid creating new pools in feature code; always use the shared `db`.
  ```ts
  import { eq } from 'drizzle-orm';
  import { db } from '@/libs/DB';
  import { counterSchema } from '@/models/Schema';

  const row = await db.query.counterSchema.findFirst({
    where: eq(counterSchema.id, 1),
  });
  ```

## Resources
- https://orm.drizzle.team/docs/connect-postgresql
- https://node-postgres.com/apis/pool
