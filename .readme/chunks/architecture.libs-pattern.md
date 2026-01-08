---
last_verified_at: 2026-01-08T22:30:00Z
source_paths:
  - src/lib/db.ts
  - src/lib/env.ts
  - src/lib/i18n.ts
  - src/lib/i18n-navigation.ts
  - src/lib/i18n-routing.ts
  - src/lib/logger.ts
  - src/lib/arcjet.ts
  - src/lib/clerk-theme.ts
---

# Centralized Library Configuration Pattern

## Purpose
All third-party library configurations are centralized in `src/lib/` to ensure consistency and prevent misconfiguration.

## Key Deviations from Standard
- Never import libraries directly (e.g., `import { drizzle } from 'drizzle-orm'`)
- Always import from `@/lib/` (e.g., `import { db } from '@/lib/db'`)
- Each library has a single source of truth configuration file
- Environment variables validated in `env.ts` before use
- Uses lowercase filenames (e.g., `db.ts`, not `DB.ts`)

## Library Configuration Files

### `src/lib/env.ts`
- Type-safe environment variable validation via @t3-oss/env-nextjs
- Validates at build time - build fails if required vars missing
- Separates `server`, `client`, and `shared` variables
- Export: `Env` object with typed environment variables

```typescript
import { Env } from '@/lib/env';
// Env.DATABASE_URL is typed and validated
```

### `src/lib/db.ts`
- DrizzleORM database client configuration
- Implements global singleton pattern for dev hot-reload
- Export: `db` - pre-configured Drizzle instance

```typescript
import { db } from '@/lib/db';

await db.select().from(counterSchema);
```

### `src/lib/logger.ts`
- LogTape logger with console + Better Stack sinks
- Auto-configures based on environment variables
- Export: `logger` - pre-configured logger instance

```typescript
import { logger } from '@/lib/logger';

logger.info('Message');
```

### `src/lib/i18n.ts`
- next-intl request configuration
- Loads locale messages dynamically
- Used by Next.js via plugin in `next.config.ts`

### `src/lib/i18n-navigation.ts` & `i18n-routing.ts`
- Locale-aware navigation helpers
- Export typed `Link`, `redirect`, `usePathname`, etc.

```typescript
import { Link } from '@/lib/i18n-navigation';
// Link is locale-aware automatically
```

### `src/lib/arcjet.ts`
- Security client with Shield WAF
- Base instance for extending in routes
- Export: default arcjet instance

```typescript
import arcjet from '@/lib/arcjet';

const aj = arcjet.withRule(/* ... */);
```

### `src/lib/clerk-theme.ts`
- Clerk component theming using Shadcn design tokens
- Uses CSS variables for automatic light/dark mode switching
- Export: `clerkAppearance` - pre-configured Appearance object

```typescript
import { clerkAppearance } from '@/lib/clerk-theme';
// Use in ClerkProvider appearance prop
```

## Important Patterns

### Adding a New Library
1. Create `src/lib/[lib-name].ts` (lowercase kebab-case)
2. Import and configure the library
3. Validate environment variables in `env.ts` if needed
4. Export pre-configured instance or helpers
5. Import from `@/lib/[lib-name]` elsewhere

### Accessing Environment Variables
Always import from `env.ts`:
```typescript
import { Env } from '@/lib/env';

const key = Env.CLERK_SECRET_KEY; // Typed and validated
```

Never use `process.env` directly except:
- In `next.config.ts` (runs before validation)
- In `middleware.ts` (edge runtime, Env increases bundle size)
- In arcjet.ts (middleware compat)

## Gotchas / Constraints

- `env.ts` is imported in `next.config.ts` to validate at build time
- Middleware should use `process.env` to avoid bundle bloat
- Don't export library instances from multiple files
- Global singleton pattern (db.ts) only works in Node.js runtime
- Use lowercase filenames to match Next.js conventions

## Related Systems
- `.readme/chunks/config.env-validation.md` - Environment variable validation details
- `.readme/chunks/database.connection-pattern.md` - Global singleton pattern
