---
last_verified_at: 2026-01-08T22:30:00Z
source_paths:
  - tsconfig.json
---

# Path Aliases & Import Conventions

## Purpose
Standardized import paths using TypeScript path aliases to improve code maintainability and refactoring.

## Key Deviations from Standard
- ALL imports from `src/` use `@/` prefix - no relative imports like `../../`
- Public assets accessible via `@/public/` alias
- Configured in both `tsconfig.json` and Vitest configs

## Path Alias Configuration

### Primary Alias: `@/`
Maps to `src/` directory:
```typescript
// Instead of: import { db } from '../../lib/db'
import { db } from '@/lib/db';
```

### Public Assets: `@/public/`
Maps to `public/` directory:
```typescript
import icon from '@/public/icons/logo.svg';
```

## tsconfig.json Configuration
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/public/*": ["./public/*"]
    }
  }
}
```

## Important Patterns

### Import Conventions
- **Libraries**: `import { db } from '@/lib/db'`
- **Components**: `import { Button } from '@/components/Button'`
- **Utils**: `import { formatDate } from '@/utils/helpers'`
- **Models**: `import { counterSchema } from '@/models/Schema'`
- **Types**: `import type { User } from '@/types/User'`

### Test Compatibility
Path aliases work in:
- Next.js (via tsconfig)
- Vitest (via `vite-tsconfig-paths` plugin)
- Playwright (uses compiled output, no special config needed)

## Gotchas / Constraints

- Must use `@/` prefix consistently - mixed styles cause confusion
- Don't create circular dependencies via `@/` imports
- IDE autocomplete requires TypeScript language server restart after tsconfig changes
- Relative imports (`./`, `../`) should ONLY be used for files in the same directory

## Related Systems
- `.readme/chunks/architecture.libs-pattern.md` - Centralized library imports
