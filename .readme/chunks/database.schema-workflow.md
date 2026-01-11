---
last_verified_at: 2026-01-10T00:00:00Z
source_paths:
  - src/models/Schema.ts
  - drizzle.config.ts
  - migrations/
---

# Database Schema & Migration Workflow

## Purpose
Schema-first development with DrizzleORM where schema changes automatically generate SQL migrations.

## Key Deviations from Standard
- Schema is source of truth in `src/models/Schema.ts` (NOT SQL files)
- Migrations auto-generated via `npm run db:generate`
- Migrations auto-apply on `npm run dev` (no manual migration needed)
- Types automatically generated from schema for full type safety

## Schema Definition

### Location: `src/models/Schema.ts`

Define tables using Drizzle schema builders:
```typescript
import { integer, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';

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

## Workflow for Schema Changes

### 1. Modify Schema
Edit `src/models/Schema.ts`:
```typescript
export const userSchema = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
});
```

### 2. Generate Migration
Run: `npm run db:generate`

This:
- Compares schema to current database state
- Generates SQL migration in `migrations/` directory
- Prompts for migration name (optional)
- Creates `.sql` file with UP migration (no DOWN migrations)

### 3. Apply Migration
**Auto-apply in dev:** Migrations run automatically on `npm run dev`

**Manual apply:** `npm run db:migrate`

**Production:** Migrations apply during build via `npm run build`

### 4. Use in Code
Types are automatically available:
```typescript
import { db } from '@/lib/db';
import { userSchema } from '@/models/Schema';

// Fully typed:
const users = await db.select().from(userSchema);
// users: { id: number; email: string; name: string | null }[]
```

## Migration Files

### Location: `migrations/`
- `0000_init-db.sql` - Initial migration
- `0001_add-users.sql` - Subsequent migrations (auto-numbered)
- `meta/` - Drizzle metadata (don't edit manually)

### Migration Format
```sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text
);
```

## Important Patterns

### Schema Column Options
```typescript
// Auto-increment ID
id: serial('id').primaryKey();

// Required text
email: text('email').notNull();

// Optional with default
status: text('status').default('active');

// Auto-updated timestamp
updatedAt: timestamp('updated_at')
  .$onUpdate(() => new Date());

// JSON columns
metadata: jsonb('metadata').$type<{ key: string }>();
```

### Working with Schema Types
```typescript
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { counterSchema } from '@/models/Schema';

// Type for SELECT queries
type Counter = InferSelectModel<typeof counterSchema>;

// Type for INSERT queries (excludes auto-generated fields)
type NewCounter = InferInsertModel<typeof counterSchema>;
```

## Gotchas / Constraints

- Never edit migration files manually - regenerate instead
- Schema file must export `pgTable` calls for Drizzle to detect them
- `$onUpdate()` only works if you update via Drizzle (not raw SQL)
- Renaming columns requires manual migration editing or data loss
- Default values in schema don't apply retroactively to existing rows

## Related Systems
- `.readme/chunks/database.connection-pattern.md` - How to use the `db` instance
- `.readme/chunks/architecture.libs-pattern.md` - Importing the configured DB client
