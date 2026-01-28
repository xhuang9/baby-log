---
last_verified_at: 2026-01-28T00:00:00Z
source_paths:
  - src/models/Schema.ts
  - src/lib/db/index.ts
  - drizzle.config.ts
  - migrations/
  - src/actions/feedLogActions.ts
  - src/app/[locale]/api/sync/push/mutations/
---

# Database Overview

## Purpose
Covers DrizzleORM setup, schema management, migrations, and database connection patterns specific to this boilerplate.

## Scope
The database layer uses DrizzleORM with PostgreSQL and implements several non-standard patterns:
- Schema-first approach with automatic migration generation
- Global connection singleton pattern to prevent hot-reload issues in development
- Dual database mode: temporary Neon instances for dev, persistent for production
- Custom PGlite server options for local/in-memory development
- Multi-baby tracking with junction tables for access control (baby_access, baby_invites)
- Soft deletes via nullable timestamp columns (archivedAt)

All database operations are type-safe with automatic type generation from the schema.

**Note:** For baby-specific multi-tenancy patterns, see `.readme/sections/account-management.index.md`.

## Chunks

- `.readme/chunks/database.schema-workflow.md`
  - Content: Schema definition in `Schema.ts` and migration generation workflow
  - Read when: Adding tables, modifying schema, or generating migrations

- `.readme/chunks/database.connection-pattern.md`
  - Content: Global singleton connection pattern and environment-specific setup
  - Read when: Understanding DB connection errors, configuring connection pooling, or debugging hot-reload issues

- `.readme/chunks/database.neon-integration.md`
  - Content: Temporary Neon database provisioning and claiming workflow
  - Read when: Setting up new environments, claiming temporary DBs, or switching database providers

- `.readme/chunks/database.pglite-local.md`
  - Content: Local PGlite server setup for file-based and in-memory modes
  - Read when: Running local dev without remote DB, testing builds, or working offline

- `.readme/chunks/database.uuid-migration.md`
  - Content: UUID migration for log entities (feed_log, sleep_log, nappy_log), client-generated IDs, and sync correctness
  - Read when: Understanding why log IDs are text/UUIDs, implementing new log types, or debugging sync ID mismatches
