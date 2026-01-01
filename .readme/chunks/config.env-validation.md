---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - src/libs/Env.ts
  - next.config.ts
---

# Environment Variable Validation

## Purpose
Type-safe environment variable validation at build time using @t3-oss/env-nextjs with Zod schemas.

## Key Deviations from Standard
- Environment variables validated BEFORE build completes
- Build fails if required variables missing or invalid
- TypeScript knows exact types (not `string | undefined`)
- Separates `server`, `client`, and `shared` variables

## Configuration

### File: `src/libs/Env.ts`
```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import * as z from 'zod';

export const Env = createEnv({
  server: {
    ARCJET_KEY: z.string().startsWith('ajkey_').optional(),
    CLERK_SECRET_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN: z.string().optional(),
    NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  },
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']).optional(),
  },
  runtimeEnv: {
    ARCJET_KEY: process.env.ARCJET_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN:
      process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN,
    NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST:
      process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NODE_ENV: process.env.NODE_ENV,
  },
});
```

## Variable Categories

### Server Variables
- Only accessible in server-side code (API routes, Server Components)
- NEVER exposed to browser
- No `NEXT_PUBLIC_` prefix

Examples:
- `CLERK_SECRET_KEY` - Clerk server API key
- `DATABASE_URL` - Database connection string
- `ARCJET_KEY` - Arcjet security key

### Client Variables
- Accessible in browser JavaScript
- MUST have `NEXT_PUBLIC_` prefix
- Bundled in client JavaScript

Examples:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics key

### Shared Variables
- Accessible in both server and client
- Usually runtime/environment indicators

Examples:
- `NODE_ENV` - Development/production flag

## Build-Time Validation

### Triggered By
Env.ts is imported in `next.config.ts`:
```typescript
import './src/libs/Env';
```

This runs validation before build starts.

### Validation Errors
```bash
npm run build

❌ Invalid environment variables:
{
  CLERK_SECRET_KEY: [ 'Required' ],
  DATABASE_URL: [ 'String must contain at least 1 character(s)' ]
}
```

Build fails immediately.

## Usage Patterns

### Importing
```typescript
import { Env } from '@/libs/Env';

// TypeScript knows exact types:
const dbUrl: string = Env.DATABASE_URL;
const apiKey: string | undefined = Env.ARCJET_KEY;
```

### Server Components
```typescript
import { Env } from '@/libs/Env';

export default function Page() {
  console.log(Env.DATABASE_URL); // ✅ Works (server-side)
  console.log(Env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY); // ✅ Works
}
```

### Client Components
```typescript
'use client';
import { Env } from '@/libs/Env';

export default function Component() {
  console.log(Env.DATABASE_URL); // ❌ Error: server-only variable
  console.log(Env.NEXT_PUBLIC_POSTHOG_KEY); // ✅ Works
}
```

### API Routes
```typescript
import { Env } from '@/libs/Env';

export async function GET() {
  const key = Env.CLERK_SECRET_KEY; // ✅ Type-safe, validated
  // ...
}
```

## Adding New Environment Variables

### 1. Add to Env.ts Schema
```typescript
export const Env = createEnv({
  server: {
    // ... existing
    NEW_API_KEY: z.string().startsWith('sk_'),
  },
  client: {
    // ... existing
    NEXT_PUBLIC_NEW_FEATURE: z.boolean().default(false),
  },
  runtimeEnv: {
    // ... existing
    NEW_API_KEY: process.env.NEW_API_KEY,
    NEXT_PUBLIC_NEW_FEATURE: process.env.NEXT_PUBLIC_NEW_FEATURE === 'true',
  },
});
```

### 2. Add to .env Files
```bash
# .env.local
NEW_API_KEY=sk_test_123

# .env (committed, non-sensitive defaults)
NEXT_PUBLIC_NEW_FEATURE=false
```

### 3. Use in Code
```typescript
import { Env } from '@/libs/Env';

const apiKey = Env.NEW_API_KEY; // string
const featureEnabled = Env.NEXT_PUBLIC_NEW_FEATURE; // boolean
```

## Custom Validation

### String Patterns
```typescript
ARCJET_KEY: z.string().startsWith('ajkey_').optional(),
```

### Number Validation
```typescript
PORT: z.coerce.number().int().positive().default(3000),
```

### URL Validation
```typescript
NEXT_PUBLIC_APP_URL: z.string().url().optional(),
```

### Enum Validation
```typescript
LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
```

## Gotchas / Constraints

- All client variables MUST start with `NEXT_PUBLIC_`
- Must manually add each variable to `runtimeEnv` (no automatic mapping)
- Validation runs at import time (eager, not lazy)
- Changing Env.ts requires restarting dev server
- Middleware should use `process.env` directly (Env increases bundle size)
- `.optional()` allows undefined, `.default()` provides fallback

## Environment File Priority

1. `.env.local` (gitignored, developer-specific)
2. `.env.production` (committed, production values)
3. `.env` (committed, shared defaults)

## Related Systems
- `.readme/chunks/config.libs-pattern.md` - Library configuration pattern
- `.readme/chunks/database.connection-pattern.md` - DATABASE_URL usage
