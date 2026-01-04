# TypeScript strict compiler options (this repo)

## Current setup
- Strict TypeScript is enabled with extra safety checks (beyond `strict: true`).
- Most noticeable behavior: indexed access (arrays/records) becomes `T | undefined`.

## Key files
- TypeScript configuration: `tsconfig.json`
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "useUnknownInCatchVariables": true,
      "noUnusedParameters": true
    }
  }
  ```

## How to use (day-to-day patterns)
- Handle indexed access:
  - default: `value = arr[0] ?? fallback`
  - optional chaining: `arr[0]?.toUpperCase()`
  - non-null assertion (only when guaranteed): `arr[0]!.toUpperCase()`
  ```ts
  const items = ['a'];
  const upper = (items[0] ?? 'fallback').toUpperCase();
  ```
- Handle `catch` as `unknown`:
  - `if (error instanceof Error) { ... }`
  ```ts
  try {
    throw new Error('boom');
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
  ```
- Mark intentionally unused params with `_` to satisfy `noUnusedParameters`.
  ```ts
  const _unused = 'ok';
  function handler(_req: Request) {
    return new Response('ok');
  }
  ```

## Resources
- https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess
- https://www.typescriptlang.org/tsconfig#useUnknownInCatchVariables
