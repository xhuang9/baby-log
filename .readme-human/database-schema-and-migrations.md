# Drizzle schema + migrations (this repo)

## Current setup
- Schema is the source of truth in TypeScript: `src/models/Schema.ts`.
- SQL migrations are generated into `migrations/` from schema changes.
- Migrations run automatically before dev and build scripts.

## Key files
- Schema: `src/models/Schema.ts`
  ```ts
  export const counterSchema = pgTable('counter', {
    id: serial('id').primaryKey(),
    count: integer('count').default(0),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  });
  ```
- Migrations: `migrations/` (and `migrations/meta/`)
- Drizzle config: `drizzle.config.ts`

## How to use
- Change DB structure: edit `src/models/Schema.ts`.
- Generate a migration: `npm run db:generate`.
- Apply migrations manually: `npm run db:migrate`.
- Query DB: `import { db } from '@/libs/DB'` and import tables from `@/models/Schema`.
  ```ts
  import { db } from '@/libs/DB';
  import { counterSchema } from '@/models/Schema';

  await db.insert(counterSchema).values({ id: 1, count: 1 });
  ```

## Resources
- https://orm.drizzle.team/docs/overview
- https://orm.drizzle.team/docs/migrations
