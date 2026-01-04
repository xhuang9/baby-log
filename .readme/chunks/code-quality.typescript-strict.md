---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - tsconfig.json
---

# TypeScript Strict Configuration Deep Dive

## Purpose
Documents the advanced TypeScript strictness options that catch bugs beyond standard `strict: true`.

## Key Advanced Options

### `noUncheckedIndexedAccess: true`
**Most Impactful Safety Check**

Forces explicit handling of potentially undefined array/object access:

```typescript
const users = ['Alice', 'Bob'];
const first = users[0]; // Type: string | undefined (not string!)

// Must handle undefined:
if (first) {
  console.log(first.toUpperCase());
}

// Or use optional chaining:
console.log(first?.toUpperCase());

// Or provide default:
const name = users[0] ?? 'Unknown';
```

**Why It Matters:**
Standard TypeScript assumes array access always succeeds. This option prevents runtime errors from out-of-bounds access.

**Common Patterns:**
```typescript
// Object access
const config: Record<string, string> = {};
const value = config.key; // string | undefined

// Safe access
const value = config.key ?? 'default';

// Array methods
const items = [1, 2, 3];
items.find(x => x > 5); // number | undefined (already safe)
items[10]; // number | undefined (now caught by noUncheckedIndexedAccess)
```

### `useUnknownInCatchVariables: true`
**Safer Error Handling**

Catch blocks use `unknown` instead of `any`:

```typescript
try {
  await riskyOperation();
} catch (error) {
  // error is 'unknown', not 'any'

  // Must narrow type before use:
  if (error instanceof Error) {
    console.log(error.message);
  } else if (typeof error === 'string') {
    console.log(error);
  } else {
    console.log('Unknown error:', error);
  }
}
```

**Why It Matters:**
Thrown values aren't always Error objects. This forces proper type checking.

### `noUnusedLocals: true` & `noUnusedParameters: true`
**Prevents Dead Code**

```typescript
function process(data: string, _options: Options) {
  // Error: 'result' is declared but never used
  const result = transform(data);

  return data;
}

// Fix: Remove unused variable or prefix with _
function process(data: string, _options: Options) {
  return data; // _options prefix signals intentional non-use
}
```

**Common Use Case:**
Callback functions with unused parameters:

```typescript
// Error: 'index' is unused
items.map((item, index) => item.name);

// Fix: Prefix with _
items.map((item, _index) => item.name);
```

### `noImplicitOverride: true`
**Explicit Inheritance**

```typescript
class Base {
  greet() {
    return 'Hello';
  }
}

class Child extends Base {
  // Error: Method 'greet' overrides base but lacks 'override' keyword
  greet() {
    return 'Hi';
  }
}

// Fix:
class Child extends Base {
  override greet() {
    return 'Hi';
  }
}
```

**Why It Matters:**
Prevents accidental overrides and makes inheritance explicit.

### `noImplicitReturns: true`
**Exhaustive Returns**

```typescript
function getStatus(code: number): string {
  if (code === 200) {
    return 'OK';
  } else if (code === 404) {
    return 'Not Found';
  }
  // Error: Not all code paths return a value
}

// Fix:
function getStatus(code: number): string {
  if (code === 200) {
    return 'OK';
  } else if (code === 404) {
    return 'Not Found';
  }
  return 'Unknown'; // Explicit default
}
```

### `noFallthroughCasesInSwitch: true`
**Explicit Switch Breaks**

```typescript
function handle(action: string) {
  switch (action) {
    case 'start':
      console.log('Starting...');
      // Error: Fallthrough case in switch
    case 'stop':
      console.log('Stopping...');
      break;
  }
}

// Fix: Add break
function handle(action: string) {
  switch (action) {
    case 'start':
      console.log('Starting...');
      break; // or return
    case 'stop':
      console.log('Stopping...');
      break;
  }
}
```

## Working with Strict Types

### Array Access Patterns
```typescript
// ❌ Unsafe
const first = array[0];
first.toUpperCase();

// ✅ Safe: Non-null assertion (only if certain)
array[0]!.toUpperCase();

// ✅ Safe: Optional chaining
array[0]?.toUpperCase();

// ✅ Safe: Default value
(array[0] ?? 'default').toUpperCase();

// ✅ Safe: Explicit check
if (array[0]) {
  array[0].toUpperCase();
}

// ✅ Safe: Array method
array.at(0)?.toUpperCase();
```

### Object Access Patterns
```typescript
// ❌ Unsafe
const value = obj[key];
value.trim();

// ✅ Safe options
const value = obj[key] ?? '';
value.trim();

// OR
if (key in obj && obj[key]) {
  obj[key].trim();
}
```

### Third-Party Library Compatibility
Some libraries have types incompatible with strict checks:

```typescript
// If library types are wrong:
// @ts-expect-error - Library types don't account for undefined
const value = legacyLib.get(key).toUpperCase();

// Better: Wrap in type-safe helper
function safeGet(key: string): string {
  return legacyLib.get(key) ?? '';
}
```

## Migration Tips

### Gradual Adoption
Can enable options one at a time:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true // Start here
    // Add others incrementally
  }
}
```

### Handling Large Codebases
- Start with new code only
- Use `// @ts-expect-error` temporarily
- Fix incrementally
- Track with TODO comments

## Gotchas / Constraints

- `noUncheckedIndexedAccess` creates many `| undefined` types - this is intentional
- Non-null assertion `!` bypasses safety - use sparingly
- Some type narrowing patterns don't work (use type guards)
- Third-party types may conflict (submit PRs or use wrappers)
- Increases development time initially (pays off with fewer bugs)

## Related Systems
- `.readme/chunks/code-quality.eslint-antfu.md` - Linting rules
- `.readme/chunks/architecture.typescript-config.md` - Full tsconfig overview
