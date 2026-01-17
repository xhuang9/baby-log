---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/account/
  - src/app/[locale]/api/bootstrap/
  - src/actions/babyActions.ts
  - src/stores/useBabyStore.ts
  - src/stores/useUserStore.ts
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/types/bootstrap.ts
---

# Account Management Overview

## Purpose
Covers the unified bootstrap post-authentication flow, baby multi-tenancy system, and client-side state management for post-authentication workflows.

## Scope
This project implements a sophisticated post-authentication flow that goes beyond standard Clerk integration:
- **Unified bootstrap endpoint** that returns account state + sync data in one API call
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
  - Content: Unified bootstrap API endpoint, state machine, and post-login flow architecture
  - Read when: Understanding post-auth flow, adding new account states, debugging redirect loops, or implementing offline-first features

### Multi-Baby Management

- `.readme/chunks/account.state-sync-pattern.md`
  - Content: Zustand store synchronization patterns with sessionStorage for PWA-safe state management
  - Read when: Adding new client state, debugging hydration issues, or understanding store persistence

### Settings UI

- `.readme/chunks/account.settings-page-ui.md`
  - Content: Client-first settings page layout and local-first preferences UI
  - Read when: Updating settings layout, adding preference sections, or troubleshooting IndexedDB-backed settings
