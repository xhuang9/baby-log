# TypeScript strictness deep dive (why you see `| undefined`)

## Current setup
- `noUncheckedIndexedAccess` is enabled, so `obj[key]` and `arr[i]` return `T | undefined`.
- This is intentional: it forces you to handle out-of-bounds/missing keys at compile time.

## Key files
- `tsconfig.json`
  ```json
  {
    "compilerOptions": {
      "noUncheckedIndexedAccess": true
    }
  }
  ```

## How to use (common fixes)
- Provide a default: `const v = obj[key] ?? 'default'`
- Narrow with an `if`: `const v = obj[key]; if (v) { ... }`
- Use `.at(i)` instead of `[i]` when you want a clearly-optional result.
  ```ts
  const map: Record<string, string> = {};
  const v = map['missing'] ?? 'default';

  const arr = ['x'];
  const first = arr.at(0); // string | undefined
  if (first) first.toUpperCase();
  ```

## Resources
- https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess
