---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - tsconfig.json
---

# TypeScript Strict Configuration

## Purpose
Enforces high type safety with advanced compiler options beyond standard `strict: true`.

## Key Deviations from Standard
This config enables MANY additional checks not included in `strict: true`:
- `noUncheckedIndexedAccess` - Treats array/object access as potentially undefined
- `noUnusedLocals` / `noUnusedParameters` - Prevents dead code
- `useUnknownInCatchVariables` - Catch blocks use `unknown` instead of `any`
- `noImplicitOverride` - Requires `override` keyword for inherited methods

These options catch bugs that standard strict mode misses.

## Advanced Type Safety Options

### `noUncheckedIndexedAccess: true`
**Impact:** Array access returns `T | undefined` instead of `T`

```typescript
const items = ['a', 'b', 'c'];
const first = items[0]; // Type: string | undefined (not string)

// Must check before use:
if (first) {
  console.log(first.toUpperCase());
}

// Or use non-null assertion if certain:
console.log(items[0]!.toUpperCase());
```

### `useUnknownInCatchVariables: true`
**Impact:** Catch blocks use `unknown` instead of `any`

```typescript
try {
  // ...
} catch (error) {
  // error is 'unknown', not 'any'
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

### `noUnusedLocals` & `noUnusedParameters: true`
**Impact:** Build fails if unused variables/parameters exist

```typescript
// Error: 'unused' is declared but never used
function example(used: string, unused: number) {
  console.log(used);
}

// Fix: Prefix with underscore if intentionally unused
function example(used: string, _unused: number) {
  console.log(used);
}
```

### `noImplicitOverride: true`
**Impact:** Must explicitly mark overridden methods

```typescript
class Base {
  greet() {
    return 'Hello';
  }
}

class Child extends Base {
  // Error: Must use 'override' keyword
  override greet() {
    return 'Hi';
  }
}
```

## Other Notable Options

- `checkJs: true` - Type checks JavaScript files
- `allowUnreachableCode: false` - Prevents dead code after return/throw
- `noFallthroughCasesInSwitch: true` - Requires break/return in switch cases
- `noImplicitReturns: true` - All code paths must return a value

## Important Patterns

### Working with Arrays
Always check index access or use safe methods:
```typescript
// Unsafe:
const value = array[index];

// Safe options:
const value = array[index] ?? defaultValue;
const value = array.at(index); // Returns undefined for out-of-bounds
if (array[index]) { /* use array[index] */ }
```

### Working with Objects
Object property access also needs checking:
```typescript
const user: Record<string, string> = {};
const name = user.name; // Type: string | undefined

// Must check:
const name = user.name ?? 'Unknown';
```

## Gotchas / Constraints

- `noUncheckedIndexedAccess` creates many `T | undefined` types - this is intentional
- Some third-party libraries may not be compatible with these strict settings
- Use `!` (non-null assertion) sparingly and only when certain
- ESLint may flag unused parameters; prefix with `_` to indicate intentional

## Related Systems
- `.readme/chunks/code-quality.eslint-antfu.md` - Linting rules that complement TypeScript
