# `next.config.ts` plugin chain (this repo)

## Current setup
- `next.config.ts` composes plugins in a fixed order:
  1) `next-intl` plugin (always)
  2) bundle analyzer (only if `ANALYZE=true`)
  3) Sentry webpack plugin (only if `NEXT_PUBLIC_SENTRY_DISABLED` is not set)
- `next.config.ts` imports `./src/libs/Env` to validate required env vars at build time.

## Key files
- Next config: `next.config.ts`
  ```ts
  import createNextIntlPlugin from 'next-intl/plugin';
  import './src/libs/Env';

  let configWithPlugins = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

  if (process.env.ANALYZE === 'true') {
    configWithPlugins = withBundleAnalyzer()(configWithPlugins);
  }

  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    configWithPlugins = withSentryConfig(configWithPlugins, {
      org: process.env.SENTRY_ORGANIZATION,
      project: process.env.SENTRY_PROJECT,
      tunnelRoute: '/monitoring',
    });
  }
  ```
- i18n request config used by the plugin: `src/libs/I18n.ts`
  ```ts
  export default getRequestConfig(async ({ requestLocale }) => {
    // loads `src/locales/<locale>.json`
  });
  ```

## How to use
- Bundle analyzer: run `npm run build-stats` (sets `ANALYZE=true`).
  ```bash
  npm run build-stats
  ```
- Disable Sentry (local/tests): set `NEXT_PUBLIC_SENTRY_DISABLED=true`.
  ```bash
  NEXT_PUBLIC_SENTRY_DISABLED=true npm run dev:next
  ```
- When adding a new plugin, append it after existing wrappers and keep the order explicit.

## Resources
- https://nextjs.org/docs/app/api-reference/next-config-js
- https://github.com/ianstormtaylor/next-intl
