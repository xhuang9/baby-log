---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - sentry.client.config.ts
  - sentry.server.config.ts
  - src/libs/Logger.ts
  - src/libs/Arcjet.ts
  - checkly.config.ts
---

# Monitoring & Observability Overview

## Purpose
Documents error monitoring (Sentry), logging (LogTape), analytics (PostHog), security (Arcjet), and uptime monitoring (Checkly).

## Scope
This boilerplate integrates multiple observability tools:
- **Sentry**: Error tracking with Spotlight for local development
- **LogTape**: Structured logging with Better Stack integration
- **PostHog**: Product analytics
- **Arcjet**: Security monitoring with Shield WAF
- **Checkly**: Uptime monitoring via E2E tests

Each tool has specific configuration for dev vs production environments.

## Chunks

- `.readme/chunks/monitoring.sentry-spotlight.md`
  - Content: Sentry setup with Spotlight for local development at port 8969
  - Read when: Debugging errors locally, configuring Sentry, or setting up error tracking

- `.readme/chunks/monitoring.logtape-betterstack.md`
  - Content: LogTape structured logging with Better Stack integration
  - Read when: Adding logging statements, configuring log sinks, or integrating with log aggregation

- `.readme/chunks/monitoring.posthog-analytics.md`
  - Content: PostHog integration for product analytics
  - Read when: Tracking events, configuring analytics, or understanding user behavior tracking

- `.readme/chunks/monitoring.instrumentation.md`
  - Content: Next.js instrumentation hooks for Sentry initialization
  - Read when: Understanding error tracking setup, configuring runtime-specific monitoring, or debugging instrumentation
