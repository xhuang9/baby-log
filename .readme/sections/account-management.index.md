---
last_verified_at: 2026-01-06T00:30:00Z
source_paths:
  - src/app/[locale]/(auth)/account/
  - src/actions/babyActions.ts
  - src/stores/useBabyStore.ts
  - src/stores/useUserStore.ts
---

# Account Management Overview

## Purpose
Covers the custom account resolution flow, baby multi-tenancy system, and client-side state management for post-authentication workflows.

## Scope
This project implements a sophisticated post-authentication flow that goes beyond standard Clerk integration:
- Account resolution entry point that determines user state and next action
- Multi-baby management system with default baby selection
- Baby sharing via invite tokens
- Access request workflow for babies without invites
- PWA-safe sessionStorage state synchronization
- Zustand stores that auto-sync with sessionStorage

This is NOT standard Clerk behavior - it's a custom implementation designed for multi-baby tracking with shared access control.

## Chunks

- `.readme/chunks/account.resolution-flow.md`
  - Content: The account resolution decision tree and routing logic
  - Read when: Understanding post-auth flow, adding new account states, or debugging redirect loops

- `.readme/chunks/account.baby-multi-tenancy.md`
  - Content: Baby access control, default baby selection, and multi-baby management patterns
  - Read when: Working with baby queries, implementing baby-scoped features, or understanding access levels

- `.readme/chunks/account.state-sync-pattern.md`
  - Content: Zustand + sessionStorage synchronization for PWA-safe state management
  - Read when: Adding new client state, debugging hydration issues, or understanding sessionStorage usage

- `.readme/chunks/account.baby-sharing.md`
  - Content: Baby invite system, access requests, and sharing workflows
  - Read when: Implementing sharing features, working with baby_invites table, or debugging invite flows
