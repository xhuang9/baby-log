# Task 15: Convert Remaining Pages to Client Components

**Status:** ✅ Complete (done in performance fix session)

**Prerequisite:** Tasks 10-14 (infrastructure)

## Goal

Convert all dashboard pages to read from IndexedDB instead of server.

## Pages Converted

| Page | Status |
|------|--------|
| `overview/page.tsx` | ✅ Shell + `OverviewContent` (IndexedDB) |
| `settings/page.tsx` | ✅ Shell + `SettingsContent` (IndexedDB) |
| `settings/babies/page.tsx` | ✅ Shell + `BabiesManagement` (IndexedDB) |
| `settings/babies/[babyId]/page.tsx` | ✅ Shell + `EditBabyContent` (IndexedDB) |
| `logs/page.tsx` | ✅ Shell (placeholder) |
| `insights/page.tsx` | ✅ Shell (placeholder) |

## Original Table (For Reference)

| Page | Current | Target |
|------|---------|--------|
| `overview/page.tsx` | ✅ Done (Task 07) | - |
| `logs/page.tsx` | Server → Postgres | Client → IndexedDB |
| `insights/page.tsx` | Server (placeholder) | Client → IndexedDB |
| `settings/page.tsx` | Server → Postgres | Client → IndexedDB |
| `settings/babies/page.tsx` | Server → Postgres | Client → IndexedDB |
| `settings/babies/[babyId]/page.tsx` | Server → Postgres | Client → IndexedDB |
| `settings/babies/new/page.tsx` | Server (form) | Keep server (creates via API) |

## Pattern for Each Page

### Before (Server Component)
```typescript
export default async function Page() {
  const { userId } = await auth();
  // ... server queries
  const data = await db.select().from(table);
  return <Component data={data} />;
}
```

### After (Client Shell + Client Content)
```typescript
// page.tsx (minimal server shell)
export default async function Page(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  return <PageContent locale={locale} />;
}

// _components/PageContent.tsx (client)
'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db/database';

export function PageContent({ locale }: { locale: string }) {
  const data = useLiveQuery(() => localDb.table.toArray(), []);

  if (data === undefined) {
    return <Skeleton />;
  }

  return <ActualContent data={data} />;
}
```

## Detailed Changes

### 1. `logs/page.tsx`

Read from `localDb.feedLogs`, `localDb.sleepLogs`, `localDb.nappyLogs`.

Key queries:
```typescript
// Get logs for current baby, sorted by date
const feedLogs = useLiveQuery(
  () => localDb.feedLogs
    .where('babyId').equals(babyId)
    .reverse().sortBy('startedAt'),
  [babyId]
);
```

### 2. `settings/page.tsx`

Read from `localDb.uiConfig` for user preferences.

### 3. `settings/babies/page.tsx`

Read from `localDb.babies` + `localDb.babyAccess`.

```typescript
const babies = useLiveQuery(async () => {
  const access = await localDb.babyAccess.toArray();
  const babyIds = access.map(a => a.babyId);
  return localDb.babies.where('id').anyOf(babyIds).toArray();
}, []);
```

### 4. `settings/babies/[babyId]/page.tsx`

Read single baby from `localDb.babies.get(babyId)`.

## Mutation Pattern

When user performs an action (e.g., edit baby):

```typescript
async function handleSave(data: BabyFormData) {
  const now = new Date();

  // 1. Update IndexedDB
  await localDb.babies.update(babyId, {
    ...data,
    updatedAt: now,
  });

  // 2. Add to outbox
  await localDb.outbox.add({
    mutationId: crypto.randomUUID(),
    entityType: 'baby',
    entityId: babyId,
    op: 'update',
    payload: { ...data, updatedAt: now },
    createdAt: now,
    status: 'pending',
    lastAttemptAt: null,
    errorMessage: null,
  });

  // 3. UI updates automatically via useLiveQuery
}
```

## Checklist

- [ ] Convert `logs/page.tsx` → `LogsContent.tsx`
- [ ] Convert `insights/page.tsx` → `InsightsContent.tsx`
- [ ] Convert `settings/page.tsx` → `SettingsContent.tsx`
- [ ] Convert `settings/babies/page.tsx` → `BabiesListContent.tsx`
- [ ] Convert `settings/babies/[babyId]/page.tsx` → `BabyEditContent.tsx`
- [ ] Update all mutations to use outbox pattern
- [ ] Test each page works offline

## Notes

- Each page can be converted independently
- Start with simplest (settings) then complex (logs)
- Forms that CREATE new records may still need online (or handle offline creation)
