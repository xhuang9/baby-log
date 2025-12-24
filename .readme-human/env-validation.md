# Environment variable validation (this repo)

## Current setup
- Env vars are validated by Zod at build/dev start via `@t3-oss/env-nextjs`.
- `src/libs/Env.ts` is imported by `next.config.ts`, so missing required vars fail early.
- Client vs server env vars are enforced:
  - client vars must be `NEXT_PUBLIC_*`
  - server vars are not accessible in client components

## Key files
- Env schema + runtime mapping: `src/libs/Env.ts`
  ```ts
  export const Env = createEnv({
    server: {
      CLERK_SECRET_KEY: z.string().min(1),
      DATABASE_URL: z.string().min(1),
      ARCJET_KEY: z.string().startsWith('ajkey_').optional(),
    },
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    runtimeEnv: {
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      ARCJET_KEY: process.env.ARCJET_KEY,
    },
  });
  ```
- Build-time validation trigger: `next.config.ts` (imports `./src/libs/Env`)
  ```ts
  import './src/libs/Env';
  ```
- Example env files: `.env`, `.env.production`, `.env.local` (local only)

## How to use
- Read env vars in server code:
  ```ts
  import { Env } from '@/libs/Env';

  const dbUrl = Env.DATABASE_URL;
  ```
- Read env vars in client components (client-only keys):
  ```tsx
  'use client';
  import { Env } from '@/libs/Env';

  export function AnalyticsDebug() {
    return <pre>{Env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}</pre>;
  }
  ```
- Add a new env var:
  1) add it to `server` or `client` schema in `src/libs/Env.ts`
  2) add it to `runtimeEnv` mapping in `src/libs/Env.ts`
  3) set it in `.env.local` (dev) and your hosting provider (prod)
  ```ts
  server: { NEW_API_KEY: z.string().min(1) },
  runtimeEnv: { NEW_API_KEY: process.env.NEW_API_KEY },
  ```

## Commands
- Typecheck/env validation happens during: `npm run build`

## Resources
- https://env.t3.gg/docs/nextjs
- https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
