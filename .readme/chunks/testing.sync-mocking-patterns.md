---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/api/sync/pull/route.test.ts
  - src/app/[locale]/api/sync/push/route.test.ts
  - src/services/sync-service.test.ts
---

# Sync API Test Mocking Patterns

> Status: active
> Last updated: 2026-01-17
> Owner: QA

## Purpose

Capture the mocking patterns used in sync-related unit tests (pull/push endpoints and sync service).

## Key Deviations from Standard

- **Module reset in selected suites**: `push/route.test.ts` and `sync-service.test.ts` call `vi.resetModules()` in `beforeEach`, while `pull/route.test.ts` does not.

## Architecture / Implementation

### Components
- `src/app/[locale]/api/sync/pull/route.test.ts` - Pull endpoint tests.
- `src/app/[locale]/api/sync/push/route.test.ts` - Push endpoint tests.
- `src/services/sync-service.test.ts` - Client sync service tests.

### Data Flow
1. Mock external dependencies (`@clerk/nextjs/server`, `@/lib/db`, `@/lib/local-db`).
2. Dynamically import the handler/service after mocks are set.
3. Use minimal request objects for Next.js handlers.

### Code Pattern
```ts
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { select: vi.fn(), insert: vi.fn() } }));

const { GET } = await import('./route');
const request = { nextUrl: { searchParams: new URLSearchParams({ babyId: '1' }) } } as NextRequest;
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `auth mock` | `vi.fn()` | Mocks Clerk `auth()` to return a userId.
| `db.select` chain | `mockReturnValue` | Emulates Drizzle chain methods.
| `globalThis.fetch` | `vi.fn()` | Stubbed in `sync-service.test.ts`.

## Gotchas / Constraints

- **Chain mocking required**: Drizzle `select().from().where().limit()` must be mocked step-by-step.
- **Module reset mismatch**: Only some suites call `vi.resetModules()`; keep that in mind when adding shared mocks.

## Testing Notes

- In route tests, create minimal `NextRequest` stubs with just `json()` or `nextUrl.searchParams`.
- In sync-service tests, mock `@/lib/local-db` helpers and `globalThis.fetch`.

## Related Systems

- `.readme/chunks/local-first.delta-sync-architecture.md` - Sync endpoints under test.
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox flush logic tested in sync-service.
