---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - tsconfig.json
  - eslint.config.mjs
  - commitlint.config.ts
  - lefthook.yml
---

# Code Quality Overview

## Purpose
Documents TypeScript strictness, ESLint configuration, git hooks, commit conventions, and validation patterns.

## Scope
This boilerplate enforces high code quality standards:
- **TypeScript**: Strict mode with advanced safety options (noUncheckedIndexedAccess, etc.)
- **ESLint**: Antfu config with React, Next.js, Tailwind, and accessibility rules
- **Git Hooks**: Lefthook runs linters and type checks on staged files
- **Commits**: Conventional Commits enforced via Commitlint
- **Validation**: Zod schemas for runtime validation with React Hook Form integration

Code quality is enforced automatically via pre-commit hooks.

## Chunks

- `.readme/chunks/code-quality.typescript-strict.md`
  - Content: Advanced TypeScript configuration with uncommon strictness options
  - Read when: Understanding type errors, configuring compiler options, or dealing with index access issues

- `.readme/chunks/code-quality.eslint-antfu.md`
  - Content: Antfu ESLint config with custom overrides and plugin configurations
  - Read when: Resolving linting errors, adding ESLint rules, or understanding code style preferences

- `.readme/chunks/code-quality.git-hooks.md`
  - Content: Lefthook configuration for pre-commit linting and type checking
  - Read when: Configuring git hooks, debugging pre-commit failures, or adding new hook actions

- `.readme/chunks/code-quality.validation-pattern.md`
  - Content: Zod validation schemas with React Hook Form integration
  - Read when: Creating forms, validating API inputs, or integrating validation with UI
