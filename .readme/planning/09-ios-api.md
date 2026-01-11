# iOS API Routes

**Priority:** Low (When iOS development begins)
**Dependencies:** 03-sync-api-endpoints.md
**Estimated Scope:** Medium

---

## Overview

Create non-localized API routes for future iOS app. These routes bypass i18n middleware and use JWT/Clerk token authentication.

---

## API Structure

```
src/app/api/v1/
├── auth/
│   └── route.ts              # POST /api/v1/auth (token validation)
├── user/
│   └── route.ts              # GET /api/v1/user (current user)
├── babies/
│   ├── route.ts              # GET /api/v1/babies (list)
│   └── [babyId]/
│       ├── route.ts          # GET /api/v1/babies/:babyId
│       └── sync/
│           └── route.ts      # GET /api/v1/babies/:babyId/sync
├── feed-logs/
│   └── route.ts              # GET, POST /api/v1/feed-logs
├── sleep-logs/
│   └── route.ts              # GET, POST /api/v1/sleep-logs
└── sync/
    ├── initial/
    │   └── route.ts          # GET /api/v1/sync/initial
    └── push/
        └── route.ts          # POST /api/v1/sync/push
```

---

## Authentication

### Option 1: Clerk Token (Recommended)

```typescript
// iOS sends Clerk session token in header
// Authorization: Bearer <clerk-session-token>

import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle request
}
```

### Option 2: API Key (for specific use cases)

```typescript
// For server-to-server or specific integrations
// X-API-Key: <api-key>

export async function GET(request: Request) {
  const apiKey = request.headers.get('X-API-Key');
  if (!validateApiKey(apiKey)) {
    return Response.json({ error: 'Invalid API key' }, { status: 401 });
  }
  // ... handle request
}
```

---

## Middleware Updates

```typescript
// src/middleware.ts

export const config = {
  matcher: [
    // Skip i18n for API v1 routes
    '/((?!api/v1|_next|.*\\..*).*)',
  ],
};

// Or handle explicitly
if (pathname.startsWith('/api/v1')) {
  // Skip i18n, apply API-specific middleware
  return apiMiddleware(request);
}
```

---

## Response Format

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "cursor": 12345,
    "hasMore": false
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## Endpoints Detail

### GET /api/v1/sync/initial

Same as web version, returns initial sync data.

### GET /api/v1/babies/:babyId/sync?since=cursor

Delta sync for a specific baby.

### POST /api/v1/sync/push

Push mutations from iOS outbox.

### GET /api/v1/feed-logs?babyId=X&limit=50&before=cursor

Paginated feed logs for a baby.

### POST /api/v1/feed-logs

Create a new feed log.

```json
{
  "id": "uuid",
  "babyId": 123,
  "method": "bottle",
  "startedAt": "2024-01-10T14:00:00Z",
  "endedAt": "2024-01-10T14:15:00Z",
  "amountMl": 120
}
```

---

## Implementation Tasks

### Phase 1: Setup

- [ ] Create `src/app/api/v1/` directory structure
- [ ] Update middleware to skip i18n for `/api/v1/*`
- [ ] Create API response helpers

### Phase 2: Auth Endpoints

- [ ] Create `/api/v1/auth` for token validation
- [ ] Create `/api/v1/user` for current user

### Phase 3: Baby Endpoints

- [ ] Create `/api/v1/babies` (list)
- [ ] Create `/api/v1/babies/[babyId]` (detail)

### Phase 4: Sync Endpoints

- [ ] Create `/api/v1/sync/initial`
- [ ] Create `/api/v1/sync/push`
- [ ] Create `/api/v1/babies/[babyId]/sync`

### Phase 5: Log Endpoints

- [ ] Create `/api/v1/feed-logs`
- [ ] Create `/api/v1/sleep-logs`
- [ ] Create endpoints for other log types

### Phase 6: Documentation

- [ ] Generate OpenAPI spec
- [ ] Create API documentation
- [ ] Set up API versioning strategy

---

## Reuse Services Layer

```typescript
// API routes should use the same services as server actions

import { assertUserCanAccessBaby } from '@/services/baby-access';
import { createFeedLog } from '@/services/feed-log';

export async function POST(request: Request) {
  const { userId } = await auth();
  const body = await request.json();

  // Same access control as web
  const access = await assertUserCanAccessBaby(userId, body.babyId);
  if (!access.success) {
    return Response.json({ error: access.error }, { status: 403 });
  }

  // Same business logic as web
  const result = await createFeedLog(body);
  return Response.json({ data: result });
}
```

---

## Success Criteria

- [ ] API routes accessible without locale prefix
- [ ] Authentication works with Clerk tokens
- [ ] Same access control as web app
- [ ] Sync endpoints compatible with iOS client
- [ ] API documented for iOS developers
