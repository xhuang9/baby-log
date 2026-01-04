---
last_verified_at: 2026-01-04T00:00:00Z
source_paths:
  - next.config.ts
---

# Next.js Configuration Pattern

## Purpose
Demonstrates conditional plugin composition in next.config.ts for environment-specific features.

## Key Deviations from Standard
- Plugins applied conditionally based on environment variables
- Single config object progressively enhanced
- Imports Env.ts for build-time validation
- Uses chaining pattern for plugin composition

## Configuration Structure

### File: `next.config.ts`
```typescript
import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/libs/Env'; // Validates env vars at build time

// Base configuration (always applied)
const baseConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  poweredByHeader: false,
  reactStrictMode: true,
  reactCompiler: true, // React 19 compiler
  outputFileTracingIncludes: {
    '/': ['./migrations/**/*'], // Bundle migrations for serverless
  },
  experimental: {
    turbopackFileSystemCacheForDev: true, // Faster dev builds
  },
};

// 1. Always apply next-intl plugin
let configWithPlugins = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

// 2. Conditionally apply bundle analyzer
if (process.env.ANALYZE === 'true') {
  configWithPlugins = withBundleAnalyzer()(configWithPlugins);
}

// 3. Conditionally apply Sentry
if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  configWithPlugins = withSentryConfig(configWithPlugins, {
    org: process.env.SENTRY_ORGANIZATION,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    telemetry: false,
    webpack: {
      reactComponentAnnotation: { enabled: true },
      treeshake: { removeDebugLogging: true },
    },
  });
}

export default configWithPlugins;
```

## Plugin Application Order

### Order Matters
Plugins wrap configuration in reverse order:

```typescript
const config = plugin3(plugin2(plugin1(baseConfig)));
```

Results in execution order: plugin1 → plugin2 → plugin3

### This Config
1. `baseConfig` - Base Next.js options
2. `createNextIntlPlugin` - Adds i18n support
3. `withBundleAnalyzer` - (if ANALYZE=true) Adds bundle analysis
4. `withSentryConfig` - (if Sentry enabled) Adds error tracking

## Conditional Features

### Bundle Analyzer
**Trigger:** `ANALYZE=true`

```bash
npm run build-stats
# Sets ANALYZE=true and runs build
```

Opens bundle analyzer at `http://localhost:8888` after build.

**Use Cases:**
- Analyzing bundle sizes
- Finding large dependencies
- Optimizing bundle splitting

### Sentry Integration
**Trigger:** NOT `NEXT_PUBLIC_SENTRY_DISABLED`

**Development:**
```bash
# Sentry disabled by default in dev (uses Spotlight instead)
npm run dev
```

**Production:**
```bash
# Sentry enabled, requires env vars:
SENTRY_ORGANIZATION=my-org
SENTRY_PROJECT=my-project
SENTRY_AUTH_TOKEN=...
npm run build
```

**Webpack Options:**
- `reactComponentAnnotation: { enabled: true }` - Annotates React components for better stack traces
- `treeshake: { removeDebugLogging: true }` - Removes Sentry debug logging from production bundle

## Base Config Options

### React Compiler
```typescript
reactCompiler: true;
```

Enables React 19's automatic memoization compiler.

**Impact:**
- Automatic optimization of React components
- Reduces need for useMemo/useCallback
- May break some patterns (check console warnings)

### Turbopack Caching
```typescript
experimental: {
  turbopackFileSystemCacheForDev: true,
}
```

Enables persistent caching for Turbopack in dev mode.

**Impact:**
- Faster subsequent dev server starts
- Cache stored in `.next/cache`
- Faster HMR after restarts

### Output File Tracing
```typescript
outputFileTracingIncludes: {
  '/': ['./migrations/**/*'],
}
```

Includes migration files in serverless output.

**Why Needed:**
- Migrations not automatically detected as dependencies
- Serverless platforms (Vercel) bundle only traced files
- Without this, migrations missing in production

### Powered By Header
```typescript
poweredByHeader: false;
```

Removes `X-Powered-By: Next.js` header.

**Why:**
- Security (don't advertise framework)
- Reduces response size

## Important Patterns

### Adding New Plugin
```typescript
import myPlugin from 'my-next-plugin';

let configWithPlugins = createNextIntlPlugin('./src/libs/I18n.ts')(baseConfig);

// Add conditionally
if (process.env.USE_MY_PLUGIN === 'true') {
  configWithPlugins = myPlugin(configWithPlugins);
}

// Or always
configWithPlugins = myPlugin(configWithPlugins);
```

### Plugin with Options
```typescript
configWithPlugins = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
})(configWithPlugins);
```

## Environment Variables in next.config.ts

### Important: Use process.env Directly
```typescript
// ✅ Correct
if (process.env.ANALYZE === 'true') { ... }

// ❌ Wrong
import { Env } from './src/libs/Env';
if (Env.ANALYZE === 'true') { ... }
```

**Why:**
- Env.ts validates only specific variables
- next.config.ts runs before validation
- Feature flags (ANALYZE) often not in Env schema

### Validation Import
```typescript
import './src/libs/Env';
```

Side effect import validates environment before build proceeds.

## Gotchas / Constraints

- Plugin order matters (test if issues arise)
- next.config.ts runs in Node.js (no browser APIs)
- Changes require restart (not hot-reloaded)
- Env.ts import must come before baseConfig for validation
- Some plugins modify webpack config (may conflict)
- TypeScript: Use `NextConfig` type for safety

## Related Systems
- `.readme/chunks/config.env-validation.md` - Environment validation
- `.readme/chunks/build.sentry-integration.md` - Sentry details
- `.readme/chunks/build.migration-bundling.md` - Migration inclusion
