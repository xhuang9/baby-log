# Centralized `src/libs/` pattern (this repo)

## Current setup
- All third-party “wiring” lives in `src/libs/` and the app imports from `@/libs/*` instead of configuring libraries ad-hoc in components/routes.
- Environment variables are validated in `src/libs/Env.ts` and imported once in `next.config.ts` to fail builds early.

## Key files
- Env validation: `src/libs/Env.ts`
- Database client: `src/libs/DB.ts`
  ```ts
  import { createDbConnection } from '@/utils/DBConnection';

  const db = globalForDb.drizzle || createDbConnection();
  export { db };
  ```
- i18n request config: `src/libs/I18n.ts`
  ```ts
  export default getRequestConfig(async ({ requestLocale }) => {
    // loads `src/locales/<locale>.json`
  });
  ```
- i18n routing/nav helpers: `src/libs/I18nRouting.ts`, `src/libs/I18nNavigation.ts`
  ```ts
  export const routing = defineRouting({ locales, defaultLocale, localePrefix });
  export const { usePathname } = createNavigation(routing);
  ```
- Logging: `src/libs/Logger.ts`
  ```ts
  await configure({ sinks: { console: getConsoleSink({ formatter: getJsonLinesFormatter() }) } });
  export const logger = getLogger(['app']);
  ```
- Security client: `src/libs/Arcjet.ts`

## How to use
- Use libraries via imports like:
  - `import { Env } from '@/libs/Env'`
  - `import { db } from '@/libs/DB'`
  - `import { logger } from '@/libs/Logger'`
  ```ts
  import { logger } from '@/libs/Logger';
  logger.info('hello');
  ```
- When adding a new integration:
  1) create `src/libs/<Name>.ts`
  2) add required env vars to `src/libs/Env.ts`
  3) import only `@/libs/<Name>` elsewhere
  ```ts
  // src/libs/MyService.ts
  import { Env } from '@/libs/Env';
  export const myService = createClient({ apiKey: Env.MY_SERVICE_KEY });
  ```

## Resources
- https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
