---
last_verified_at: 2026-01-24T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/account/
  - src/app/[locale]/api/bootstrap/
  - src/actions/babyActions.ts
  - src/stores/useBabyStore.ts
  - src/stores/useUserStore.ts
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/types/bootstrap.ts
  - src/lib/local-db/helpers/session-validation.ts
---

# Account Management Overview

## Purpose
Covers the unified bootstrap post-authentication flow, baby multi-tenancy system, and client-side state management for post-authentication workflows.

## Scope
This project implements a sophisticated post-authentication flow that goes beyond standard Clerk integration:
- **Unified bootstrap endpoint** that returns account state + sync data in one API call
- **User switch detection** - validates cached session against current Clerk user and clears stale data
- State machine-driven UI that handles all account states (locked, no_baby, pending_request, has_invites, select_baby, ready)
- Offline fallback using IndexedDB cache
- Multi-baby management system with default baby selection
- Baby sharing via invite tokens
- Access request workflow for babies without invites
- Zustand stores synchronized with IndexedDB

This is NOT standard Clerk behavior - it's a custom implementation designed for multi-baby tracking with shared access control and offline-first architecture.

## Chunks

### Bootstrap System (NEW - Replaces Old Resolution Flow)

- `.readme/chunks/account.bootstrap-unified-flow.md`
  - Content: Unified bootstrap API endpoint, state machine, post-login flow architecture, and user switch detection
  - Read when: Understanding post-auth flow, adding new account states, debugging redirect loops, understanding user data isolation, or implementing offline-first features

### Multi-Baby Management

- `.readme/chunks/account.state-sync-pattern.md`
  - Content: Zustand store synchronization patterns with sessionStorage for PWA-safe state management
  - Read when: Adding new client state, debugging hydration issues, or understanding store persistence

### Settings UI

- `.readme/chunks/account.settings-page-ui.expired.md` **[EXPIRED]**
  - Content: Client-first settings page layout, accordion pattern, and local-first preferences UI
  - Read when: Updating settings layout, adding preference sections, or troubleshooting IndexedDB-backed settings
  - Status: Awaiting refresh (ThemeSetting.tsx modified)

- `.readme/chunks/account.widget-settings-architecture.md`
  - Content: Reusable hook pattern for widget-specific settings (TimeSwiper, AmountSlider), debounced vs immediate saves
  - Read when: Adding new widget settings, refactoring settings components, understanding the shared settings hook pattern, or implementing debounced/immediate save strategies
