---
last_verified_at: 2025-12-31T15:30:00Z
source_paths:
  - vitest.config.mts
---

# Vitest Dual-Mode Testing

## Purpose
Separates unit tests (Node environment) from UI tests (browser environment) for optimal testing performance and capabilities.

## Key Deviations from Standard
- Single Vitest config with TWO projects: `unit` and `ui`
- File extension determines test environment automatically
- Browser tests use real Playwright browser (not JSDOM)
- Tests colocated with source files

## Project Configuration

### File: `vitest.config.mts`
```typescript
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.{js,ts}'],
          exclude: ['src/hooks/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ui',
          include: ['**/*.test.tsx', 'src/hooks/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
```

## Test Environment Selection

### Unit Tests (Node Environment)
**Pattern:** `*.test.ts` or `*.test.js` (NOT `.tsx`)

Use for:
- Pure functions
- Utility functions
- API route logic
- Database operations
- Server-side code

```typescript
// src/utils/helpers.test.ts
import { describe, expect, it } from 'vitest';
import { formatDate } from './helpers';

describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate(new Date('2024-01-01'))).toBe('Jan 1, 2024');
  });
});
```

### UI Tests (Browser Environment)
**Pattern:** `*.test.tsx` or hooks in `src/hooks/**/*.test.ts`

Use for:
- React components
- Hooks
- Browser APIs (localStorage, fetch, etc.)
- User interactions
- DOM manipulation

```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders text', async () => {
    render(<Button>Click me</Button>);
    await expect.element(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

## Running Tests

### All Tests
```bash
npm run test
# Runs both unit and ui projects
```

### Specific Project
```bash
npx vitest --project unit
npx vitest --project ui
```

### Watch Mode
```bash
npx vitest --watch
# Auto-reruns tests on file changes
```

### Coverage
```bash
npx vitest --coverage
# Generates coverage report
```

## Important Patterns

### Testing React Components
```typescript
import { render, screen, userEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Counter', () => {
  it('increments on button click', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole('button', { name: /increment/i });
    await user.click(button);

    await expect.element(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

### Testing Custom Hooks
```typescript
// src/hooks/useCounter.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', async () => {
    const { result } = renderHook(() => useCounter());

    result.current.increment();

    await waitFor(() => {
      expect(result.current.count).toBe(1);
    });
  });
});
```

### Testing Server Functions
```typescript
// src/app/api/users/route.test.ts
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/users', () => {
  it('returns users', async () => {
    const request = new Request('http://localhost/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(3);
  });
});
```

## Test Utilities

### Available Testing Library
```typescript
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import { userEvent } from '@testing-library/user-event';
```

### Vitest Matchers
```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(array).toHaveLength(3);
expect(string).toContain('substring');
expect(fn).toHaveBeenCalled();
```

### Browser-Specific Matchers
```typescript
await expect.element(element).toBeInTheDocument();
await expect.element(element).toBeVisible();
await expect.element(element).toHaveTextContent('text');
```

## Gotchas / Constraints

- `.tsx` files ALWAYS run in browser mode (even simple components)
- Hooks must be in `src/hooks/**/*.test.ts` to use browser mode
- Browser tests slower than Node tests
- Browser tests use Playwright (heavier than JSDOM)
- Can't mix Node and browser APIs in same test file

## Related Systems
- `.readme/chunks/testing.playwright-e2e.md` - E2E testing
