# Planning Index

**Last updated:** 2026-01-10

This folder contains implementation plans for future features. Each document is self-contained with requirements, tasks, and success criteria.

---

## Implementation Order (Recommended)

### Foundation (Do First)

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 01 | [State Management & Sync](./01-state-management-sync.md) | High | None |
| 02 | [Offline-First Architecture](./02-offline-first-architecture.md) | High | 01 |
| 03 | [Sync API Endpoints](./03-sync-api-endpoints.md) | High | 01 |

### Core Features

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 04 | [Logs Page](./04-logs-page.md) | High | 01 |
| 07 | [Additional Data Models](./07-additional-data-models.md) | High | 01 |
| 08 | [Feed UI Timer](./08-feed-ui-timer.md) | High | None |

### Polish & Enhancement

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 05 | [Insights Dashboard](./05-insights-dashboard.md) | Medium | 01, 07 |
| 06 | [Settings Refinement](./06-settings-refinement.md) | Medium | None |

### Future (When Needed)

| # | Document | Priority | Dependencies |
|---|----------|----------|--------------|
| 09 | [iOS API](./09-ios-api.md) | Low | 03 |

---

## Quick Reference

### High Priority - Foundation
- **01-state-management-sync.md** - IndexedDB sync on login, Web Workers for background sync
- **02-offline-first-architecture.md** - SSR strategy, offline mode, security considerations
- **03-sync-api-endpoints.md** - Delta sync API, outbox flush logic

### High Priority - Features
- **04-logs-page.md** - Filter logs, edit existing entries
- **07-additional-data-models.md** - Sleep, Solids, Bath, Activities
- **08-feed-ui-timer.md** - Timer-based feed tracking

### Medium Priority
- **05-insights-dashboard.md** - Charts with shadcn/ui
- **06-settings-refinement.md** - Hand mode, layout fixes

### Low Priority
- **09-ios-api.md** - Non-localized API for mobile app

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
- Baby access requests (in-app approval)
- Folder reorganization (Phases 1-5)
- Local-first foundation (Dexie schema, QueryProvider, query-keys)
- Services layer (`baby-access.ts`)
