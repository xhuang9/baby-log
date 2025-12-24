# Vitest dual-mode testing (this repo)

## Current setup
- Single Vitest config (`vitest.config.mts`) defines two projects:
  - `unit` (Node): `src/**/*.test.ts`
  - `ui` (browser via Playwright): `*.test.tsx` and `src/hooks/**/*.test.ts`
- Coverage includes `src/**/*`.

## Key files
- Vitest config: `vitest.config.mts`
  ```ts
  projects: [
    { test: { name: 'unit', include: ['src/**/*.test.{js,ts}'], environment: 'node' } },
    { test: { name: 'ui', include: ['**/*.test.tsx', 'src/hooks/**/*.test.ts'], browser: { enabled: true } } },
  ]
  ```
- Test scripts: `package.json` (`test`)
  ```json
  { "scripts": { "test": "vitest run" } }
  ```

## How to use
- Run all tests: `npm run test`
- Run a single project:
  - `npx vitest --project unit`
  - `npx vitest --project ui`
- Place tests so they run in the intended environment:
  - Node: `src/foo.test.ts`
  - Browser: `src/foo.test.tsx`
  ```ts
  // src/utils/sum.test.ts (unit / node)
  import { expect, test } from 'vitest';
  test('sum', () => expect(1 + 1).toBe(2));
  ```
  ```tsx
  // src/components/Button.test.tsx (ui / browser)
  import { render, screen } from '@testing-library/react';
  import { expect, test } from 'vitest';
  import { Button } from './Button';

  test('renders', async () => {
    render(<Button>Click</Button>);
    await expect.element(screen.getByText('Click')).toBeInTheDocument();
  });
  ```

## Resources
- https://vitest.dev/guide/
- https://vitest.dev/guide/browser/
