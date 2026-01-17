---
last_verified_at: 2026-01-17T11:12:21Z
source_paths:
  - next.config.ts
  - src/instrumentation.ts
  - src/instrumentation-client.ts
  - package.json
  - README.md
---

# Build & Deployment Overview

## Purpose
Documents build configuration, Next.js config patterns, Sentry integration, and deployment workflows.

## Scope
The build process includes several custom configurations:
- **Next.js Config**: Conditional plugin composition (next-intl, Sentry, bundle analyzer)
- **Sentry Webpack Plugin**: Source map upload with tunneling route
- **React Compiler**: Enabled for optimization
- **Turbopack**: File system caching in development
- **Migration Bundling**: Migrations included in output file tracing

Build configuration is environment-aware and optimized for both dev and production.

## Chunks

- `.readme/chunks/build.next-config-pattern.md`
  - Content: Conditional plugin composition in `next.config.ts`
  - Read when: Adding Next.js plugins, configuring builds, or understanding the plugin chain

- `.readme/chunks/build.sentry-integration.md`
  - Content: Sentry initialization and environment requirements (TODO)
  - Read when: Wiring error monitoring, configuring DSN and source map upload, or validating the instrumentation hooks

- `.readme/chunks/build.migration-bundling.md`
  - Content: Including migration files in output for serverless deployments
  - Read when: Deploying to serverless platforms, debugging missing migrations, or configuring output tracing

- `.readme/chunks/build.npm-scripts.md`
  - Content: Custom npm scripts for parallel execution and build variants
  - Read when: Understanding build workflows, adding new scripts, or debugging build processes
