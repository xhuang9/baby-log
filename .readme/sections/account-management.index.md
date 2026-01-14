---
last_verified_at: 2026-01-14T00:00:00Z
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

- `.readme/chunks/local-first.bootstrap-storage.md`
  - Content: How bootstrap data is stored in IndexedDB for offline access and sync status tracking
  - Read when: Understanding offline behavior, debugging cache issues, or working with sync indicators

### Multi-Baby Management

- `.readme/chunks/account.baby-multi-tenancy.md`
  - Content: Baby access control, default baby selection, and multi-baby management patterns
  - Read when: Working with baby queries, implementing baby-scoped features, or understanding access levels

- `.readme/chunks/account.state-sync-pattern.md`
  - Content: Zustand store synchronization patterns with sessionStorage for PWA-safe state management
  - Read when: Adding new client state, debugging hydration issues, or understanding store persistence

### Sharing & Invites

- `.readme/chunks/account.baby-sharing.md`
  - Content: Baby invite system, access requests, and sharing workflows
  - Read when: Implementing sharing features, working with baby_invites table, or debugging invite flows
