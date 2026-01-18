# Planning Index

**Last updated:** 2026-01-17

This folder contains implementation plans for future features. Each document is self-contained with requirements, tasks, and success criteria.

---

## Implementation Order (Recommended)

### Foundation (Do First)

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 01 | [State Management & Sync](./01-state-management-sync.md) | High | None |
| 02 | [Offline-First Architecture](./02-offline-first-architecture.md) | High | 01 |
| 03 | [Sync API Endpoints](./03-sync-api-endpoints.md) | High | 01 |
| 12 | [Operations Layer (Service-First Mutations)](./12-operations-layer.md) | Medium | 01, 02, 03 |

### Core Features

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 04 | [Logs Page](./04-logs-page.md) | High | 01 |
| 08 | [Additional Data Models](./08-additional-data-models.md) | High | 01 |
| 09 | [Feed UI Timer](./09-feed-ui-timer.md) | High | None |
| 11 | [Baby Access Requests & Sharing](./11-baby-access-requests.md) | High | 01 |

### Polish & Enhancement

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 05 | [UI Config Sync & Settings Refinement](./05-ui-config-sync.md) | Medium | 01, 03 |
| 07 | [Insights Dashboard](./07-insights-dashboard.md) | Medium | 01, 08 |

### Future (When Needed)

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 10 | [iOS API](./10-ios-api.md) | Low | 03 |

---

## Quick Reference

### High Priority - Foundation
- **01-state-management-sync.md** - IndexedDB sync on login, Web Workers for background sync
- **02-offline-first-architecture.md** - SSR strategy, offline mode, security considerations
- **03-sync-api-endpoints.md** - Delta sync API, outbox flush logic

### High Priority - Features
- **04-logs-page.md** - Filter logs, edit existing entries
- **08-additional-data-models.md** - Sleep, Solids, Bath, Activities
- **09-feed-ui-timer.md** - Timer-based feed tracking
- **11-baby-access-requests.md** - Access requests, invites, caregiver management

### Medium Priority
- **05-ui-config-sync.md** - UI settings storage, merge, sync, and settings layout
- **07-insights-dashboard.md** - Charts with shadcn/ui
- **12-operations-layer.md** - Service-first operations layer for UI mutations

### Low Priority
- **10-ios-api.md** - Non-localized API for mobile app

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Local storage | Dexie (IndexedDB) | Durable, reactive queries |
| Sync strategy | Pull-based delta | No WebSocket on Vercel |
| Conflict resolution | Last-Write-Wins | Simple, acceptable for this app |
| SSR strategy | Shell only | Content from IndexedDB |
| Background sync | Web Workers | Don't block main thread |

---

## Completed (Archived from .readme/task/)

The following have been implemented and removed from task folder:

- Account + Baby resolution flow
- Folder reorganization (Phases 1-5)
- Local-first foundation (Dexie schema, QueryProvider, query-keys)
- Services layer (`baby-access.ts`)
