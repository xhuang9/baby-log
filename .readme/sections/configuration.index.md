---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - src/libs/
---

# Configuration Overview

## Purpose
Documents the centralized library configuration pattern and environment variable management.

## Scope
All third-party library configurations are centralized in `src/libs/`:
- Type-safe environment variables validated at build time via @t3-oss/env-nextjs
- Each library has its own config file (DB.ts, Logger.ts, Arcjet.ts, etc.)
- Import from `@/libs/[LibName]` to get pre-configured instances
- No direct library imports elsewhere in the codebase

This pattern ensures consistent configuration and prevents misconfiguration.

## Chunks

- `.readme/chunks/config.env-validation.md`
  - Content: Type-safe environment variable validation in `Env.ts` with Zod schemas
  - Read when: Adding new environment variables, understanding validation errors, or configuring for new environments

- `.readme/chunks/config.libs-pattern.md`
  - Content: The centralized `src/libs/` pattern for library configuration
  - Read when: Adding new third-party libraries, configuring existing ones, or understanding the config structure

- `.readme/chunks/config.logger-setup.md`
  - Content: LogTape logging with Better Stack integration for production
  - Read when: Adding logging, configuring log levels, or integrating with logging services

- `.readme/chunks/config.arcjet-security.md`
  - Content: Arcjet security client with Shield WAF, bot detection, and rate limiting
  - Read when: Configuring security rules, working with WAF, or adding rate limiting
