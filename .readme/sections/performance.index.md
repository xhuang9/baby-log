---
last_verified_at: 2026-01-04T12:00:00Z
source_paths:
  - next.config.ts
  - src/app/[locale]/(auth)/loading.tsx
  - src/components/ui/page-skeleton.tsx
  - public/manifest.json
---

# Performance & PWA Overview

## Purpose
Documents Progressive Web App (PWA) implementation, service worker caching strategies, loading states with Suspense, and performance optimization patterns.

## Scope
This project implements PWA functionality for:
- **Offline Support**: Service worker with multi-tier caching strategies
- **Instant Navigation**: Suspense-based loading states with skeleton UI
- **App Installation**: PWA manifest for mobile/desktop installation
- **Performance**: StaleWhileRevalidate and NetworkFirst patterns for optimal UX

The PWA is production-only (disabled in dev) and includes comprehensive caching rules for fonts, static assets, app shell, and API routes.

## Chunks

- `.readme/chunks/performance.pwa-config.md`
  - Content: next-pwa configuration with service worker caching strategies
  - Read when: Configuring PWA behavior, adjusting cache duration, or understanding offline support

- `.readme/chunks/performance.loading-states.md`
  - Content: Suspense-based loading.tsx pattern across route groups
  - Read when: Adding loading states to routes, understanding Suspense boundaries, or working with route-level loading UI

- `.readme/chunks/performance.skeleton-components.md`
  - Content: Reusable skeleton components for loading states
  - Read when: Creating loading UI, building new skeleton patterns, or maintaining consistent loading experiences

- `.readme/chunks/performance.pwa-manifest.md`
  - Content: PWA manifest configuration and installation behavior
  - Read when: Configuring app installation, setting start URL, or customizing PWA metadata
