---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/proxy.ts
  - src/app/[locale]/(auth)/(app)/overview/
  - src/app/[locale]/(auth)/(app)/settings/
  - next.config.ts
  - src/app/[locale]/(auth)/loading.tsx
  - src/components/ui/page-skeleton.tsx
  - src/components/OfflineBanner.tsx
  - src/hooks/useOnlineStatus.ts
  - public/manifest.json
---

# Performance & PWA Overview

## Purpose
Documents Progressive Web App (PWA) implementation, service worker caching strategies, offline indicators, loading states with Suspense, and instant navigation architecture.

## Scope
This project prioritizes performance-first architecture:
- **Instant Navigation**: Dashboard pages skip server auth checks and render from IndexedDB client-side
- **Offline Support**: Service worker with multi-tier caching strategies + IndexedDB cache
- **Offline Indicators**: Reactive banner showing network status and last sync time
- **Loading States**: Suspense-based loading with skeleton UI
- **App Installation**: PWA manifest for mobile/desktop installation

The architecture prioritizes perceived instant performance by eliminating server round-trip delays on page navigation.

## Key Architectural Decision

**Priority**: Instant page loads > Full offline support

Dashboard pages bypass Clerk middleware and render entirely client-side from IndexedDB. This eliminates 200-500ms+ server auth delays, delivering instant perceived performance.

## Chunks

### Instant Navigation Architecture

- `.readme/chunks/performance.instant-navigation.md`
  - Content: Performance-first architecture with middleware bypass, instant-loading page shells, and IndexedDB-driven rendering
  - Read when: Understanding why dashboard pages skip server auth, working with middleware routing, converting pages to client-first pattern, or optimizing navigation performance

### PWA Configuration

- `.readme/chunks/performance.pwa-config.md`
  - Content: next-pwa configuration with service worker caching strategies
  - Read when: Configuring PWA behavior, adjusting cache duration, or understanding offline support

- `.readme/chunks/performance.pwa-manifest.md`
  - Content: PWA manifest configuration and installation behavior
  - Read when: Configuring app installation, setting start URL, or customizing PWA metadata

### Offline UX

- `.readme/chunks/performance.offline-banner.md`
  - Content: OfflineBanner component and useOnlineStatus hook for network status tracking
  - Read when: Implementing offline indicators, adding manual sync triggers, or working with network-aware UI

### Loading States

- `.readme/chunks/performance.loading-states.md`
  - Content: Suspense-based loading.tsx pattern across route groups
  - Read when: Adding loading states to routes, understanding Suspense boundaries, or working with route-level loading UI

- `.readme/chunks/performance.skeleton-components.md`
  - Content: Reusable skeleton components for loading states
  - Read when: Creating loading UI, building new skeleton patterns, or maintaining consistent loading experiences
