---
last_verified_at: 2026-01-04T00:00:00Z
source_paths:
  - src/libs/DB.ts
  - src/libs/Env.ts
  - src/libs/I18n.ts
  - src/libs/I18nNavigation.ts
  - src/libs/I18nRouting.ts
  - src/libs/Logger.ts
  - src/libs/Arcjet.ts
  - src/libs/ClerkTheme.ts
---

# Centralized Library Configuration Pattern

## Purpose
All third-party library configurations are centralized in `src/libs/` to ensure consistency and prevent misconfiguration.

## Key Deviations from Standard
- Never import libraries directly (e.g., `import { drizzle } from 'drizzle-orm'`)
- Always import from `@/libs/` (e.g., `import { db } from '@/libs/DB'`)
- Each library has a single source of truth configuration file
- Environment variables validated in `Env.ts` before use

## Library Configuration Files

### `src/libs/Env.ts`
- Type-safe environment variable validation via @t3-oss/env-nextjs
- Validates at build time - build fails if required vars missing
- Separates `server`, `client`, and `shared` variables
- Export: `Env` object with typed environment variables

```typescript
import { Env } from '@/libs/Env';
// Env.DATABASE_URL is typed and validated
```

### `src/libs/DB.ts`
- DrizzleORM database client configuration
- Implements global singleton pattern for dev hot-reload
- Export: `db` - pre-configured Drizzle instance

```typescript
import { db } from '@/libs/DB';

await db.select().from(counterSchema);
```

### `src/libs/Logger.ts`
- LogTape logger with console + Better Stack sinks
- Auto-configures based on environment variables
- Export: `logger` - pre-configured logger instance

```typescript
import { logger } from '@/libs/Logger';

logger.info('Message');
```

### `src/libs/I18n.ts`
- next-intl request configuration
- Loads locale messages dynamically
- Used by Next.js via plugin in `next.config.ts`

### `src/libs/I18nNavigation.ts` & `I18nRouting.ts`
- Locale-aware navigation helpers
- Export typed `Link`, `redirect`, `usePathname`, etc.

```typescript
import { Link } from '@/libs/I18nNavigation';
// Link is locale-aware automatically
```

### `src/libs/Arcjet.ts`
- Security client with Shield WAF
- Base instance for extending in routes
- Export: default arcjet instance

```typescript
import arcjet from '@/libs/Arcjet';

const aj = arcjet.withRule(/* ... */);
```

### `src/libs/ClerkTheme.ts`
- Clerk component theming using Shadcn design tokens
- Uses CSS variables for automatic light/dark mode switching
- Export: `clerkAppearance` - pre-configured Appearance object

```typescript
import { clerkAppearance } from '@/libs/ClerkTheme';
// Use in ClerkProvider appearance prop
```

## Important Patterns

### Adding a New Library
1. Create `src/libs/[LibName].ts`
2. Import and configure the library
3. Validate environment variables in `Env.ts` if needed
4. Export pre-configured instance or helpers
5. Import from `@/libs/[LibName]` elsewhere

### Accessing Environment Variables
Always import from `Env.ts`:
```typescript
import { Env } from '@/libs/Env';

const key = Env.CLERK_SECRET_KEY; // Typed and validated
```

Never use `process.env` directly except:
- In `next.config.ts` (runs before validation)
- In `middleware.ts` (edge runtime, Env increases bundle size)
- In Arcjet.ts (middleware compat)

## Gotchas / Constraints

- `Env.ts` is imported in `next.config.ts` to validate at build time
- Middleware should use `process.env` to avoid bundle bloat
- Don't export library instances from multiple files
- Global singleton pattern (DB.ts) only works in Node.js runtime

## Related Systems
- `.readme/chunks/config.env-validation.md` - Environment variable validation details
- `.readme/chunks/database.connection-pattern.md` - Global singleton pattern
