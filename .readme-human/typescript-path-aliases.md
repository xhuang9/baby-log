# TypeScript path aliases (this repo)

## Current setup
- Imports from `src/` use `@/` instead of relative paths.
- Public assets can be imported via `@/public/*`.

## Key files
- Path alias config: `tsconfig.json`
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
- Vitest alias support: `vitest.config.mts` (via `vite-tsconfig-paths`)
  ```ts
  export default defineConfig({
    plugins: [react(), tsconfigPaths()],
  });
  ```

## How to use
- Use `@/` for anything under `src/`:
  - `import { db } from '@/libs/DB'`
  - `import { counterSchema } from '@/models/Schema'`
- Use `@/public/` for files under `public/`:
  - `import logo from '@/public/assets/images/logo.svg'`
  ```ts
  import type { InferSelectModel } from 'drizzle-orm';
  import { logger } from '@/libs/Logger';
  import { counterSchema } from '@/models/Schema';

  type Counter = InferSelectModel<typeof counterSchema>;
  logger.info('typed imports work');
  ```

## Resources
- https://www.typescriptlang.org/tsconfig#paths
- https://vite.dev/config/shared-options#resolve-alias
