---
last_verified_at: 2026-01-20T00:00:00Z
source_paths:
  - src/actions/feedLogActions.ts
  - src/models/Schema.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/
  - src/components/feed/
  - src/stores/useTimerStore.ts
  - src/hooks/useHoldAction.ts
---

# Feed Logging System

## Purpose

Custom baby feed tracking system with dual feeding methods (breast/bottle), automatic amount estimation for breast feeds, timer-based duration tracking, and caregiver attribution through access control.

## Scope

This section documents the feed logging implementation including:

- Server actions for creating and retrieving feed logs
- Feed log database schema with user tracking
- UI components for adding feeds via bottom sheet
- Timer-based duration tracking with persistent state
- Automatic estimation logic for breast feed amounts
- Activity tile pattern for overview display
- Activity logs page with filtering, view modes, and editing
- Edit/delete operations with local-first sync
- Log formatting and display utilities

## Key Features

- **Dual Method Support**: Bottle feeds (volume-based) and breast feeds (duration-based)
- **Timer Integration**: Persistent timers for real-time activity tracking with dual input modes (timer vs. manual)
- **Automatic Estimation**: Breast feed amounts estimated from duration using default model
- **Caregiver Attribution**: Feed logs track which user logged them and display their caregiver label
- **Access Control**: Only editors/owners can log feeds
- **Time Ago Formatting**: Custom relative time display (e.g., "2h 15m ago", "3d ago")

## Chunks

### Core Feed Logging

#### `chunks/feed-logging.server-actions.md`

- **Content**: Feed log server actions with access control and estimation logic
- **Read when**: Implementing feed logging, understanding permission checks, or working with automatic estimation

#### `chunks/feed-logging.schema-design.md`

- **Content**: Feed log database schema and relationships
- **Read when**: Modifying feed log schema, adding fields, or understanding the data model

#### `chunks/feed-logging.ui-components.md`

- **Content**: Activity tile pattern, full-screen bottom sheet with hand-mode ergonomics, TimeSwiper and AmountSlider integration
- **Read when**: Building activity tiles, working with sheet UI, understanding AddFeedModal improvements, or implementing hand-mode aware layouts

#### `chunks/feed-logging.amount-slider.md`

- **Content**: AmountSlider component with persistent settings, hand-mode support, metric/imperial conversion, and reversible direction
- **Read when**: Working with bottle feed amount input, implementing settings popovers, understanding hand-mode patterns, or adding similar configurable input components

#### `chunks/feed-logging.estimation-algorithm.md`

- **Content**: Breast feed amount estimation logic and future improvement paths
- **Read when**: Modifying estimation logic, adding age/gender-based models, or debugging estimated amounts

### Timer System

#### `chunks/feed-logging.timer-persistence.md`

- **Content**: Timer state management with Zustand and IndexedDB persistence via UIConfig, per-baby timer scoping, and cross-device sync with LWW conflict resolution
- **Read when**: Working with timer state, understanding timer persistence, debugging timer hydration, or adding timer features

#### `chunks/feed-logging.timer-widget.md`

- **Content**: TimerWidget component with real-time updates, start/pause/reset controls, hold-to-adjust pattern using useHoldAction hook, and 100ms update intervals
- **Read when**: Building timer UI, implementing hold-to-adjust interactions, understanding useHoldAction hook, or debugging timer display issues

#### `chunks/feed-logging.timer-integration.md`

- **Content**: Dual input modes (timer vs. manual) in AddFeedModal, timer-to-feed-log conversion, actual start time reconstruction, and validation logic
- **Read when**: Working with AddFeedModal, understanding timer/manual mode switching, debugging timer submission, or implementing similar dual-mode input patterns

### Activity Logs Page

#### `chunks/feed-logging.activity-logs-page.md`

- **Content**: Complete logs page implementation with filtering, view modes, unified log querying, date grouping, and edit/delete modal integration
- **Read when**: Building the logs feature, implementing filter state with URL sync, understanding date grouping and view modes, or working with edit modals

#### `chunks/feed-logging.edit-delete-operations.md`

- **Content**: Edit/delete operations layer for feed and sleep logs with local-first sync pattern, access control, and error handling
- **Read when**: Implementing edit/delete flows, understanding operations pattern, working with outbox sync, or handling edit/delete in modal components

#### `chunks/feed-logging.log-formatting.md`

- **Content**: Formatting utilities for dates (relative), durations, times, and structured log display with left/right columns for efficient scanning
- **Read when**: Working with log display, implementing formatting logic, understanding LogItem parsing, or extending formatting for new activity types

### UI Patterns

#### `chunks/ui-patterns.activity-modals.md`

- **Content**: Shared modal architecture, modular component pattern, hook responsibilities, testing approach, and guide for adding new activity modals
- **Read when**: Building new activity modals (nappy, meal, medication), refactoring existing modals, understanding the modular architecture, or writing tests for modal hooks

## Related Sections

- `.readme/sections/account-management.index.md` - Baby access control and multi-tenancy
- `.readme/sections/database.index.md` - Schema patterns and migration workflow
