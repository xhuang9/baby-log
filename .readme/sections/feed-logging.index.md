---
last_verified_at: 2026-02-04T15:45:00Z
source_paths:
  - src/actions/feedLogActions.ts
  - src/models/Schema.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/
  - src/components/feed/
  - src/stores/useTimerStore.ts
  - src/hooks/useHoldAction.ts
  - src/hooks/useTimerSave.ts
  - src/hooks/useFoodTypes.ts
  - src/app/[locale]/api/sync/push/mutations/nappy-log.ts
  - src/app/[locale]/api/sync/push/mutations/food-types.ts
  - src/app/[locale]/api/sync/push/mutations/pumping-log.ts
  - src/lib/local-db/nappy-logs.ts
  - src/lib/local-db/types/food-types.ts
  - src/lib/local-db/types/logs.ts
  - src/lib/local-db/helpers/food-types.ts
  - src/lib/local-db/helpers/pumping-logs.ts
  - src/services/operations/food-types.ts
  - src/services/operations/pumping-log.ts
  - src/services/sync/apply/pumping-log.ts
  - src/app/[locale]/(auth)/(app)/logs/_components/NappyTile.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/NappyLogModal.tsx
---

# Feed Logging System

## Purpose

Custom baby feed tracking system with dual feed methods (breast/bottle), automatic amount estimation for breast feeds, timer-based duration tracking, and caregiver attribution through access control.

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
- Food types library for solids logging with create/delete operations

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

#### `chunks/feed-logging.timeswiper-date-range.md`

- **Content**: TimeSwiper date range constraint (-7 days to +1 day 23:59), boundary clamping, pixel offset calculations, and day offset display
- **Read when**: Modifying time selection range, understanding date boundary logic, debugging timeline calculations, or implementing similar constrained scrollable timelines

#### `chunks/feed-logging.dual-time-swiper.md`

- **Content**: DualTimeSwiper component for breast feed logging with tab-based time switching, inline duration editing, hand-mode layout, and invalid duration error handling
- **Read when**: Implementing breast feed time input, understanding tab-based switching patterns, working with inline editable inputs, or implementing similar time range pickers with duration display

#### `chunks/feed-logging.timeswiper-state-isolation.md`

- **Content**: TimeSwiper state isolation pattern (February 2026) - refactor to render independent TimeSwiper instances per tab instead of toggling a single instance, eliminating state bleed bugs
- **Read when**: Understanding the TimeSwiper architecture post-February 2026, debugging state synchronization issues, implementing features that interact with time picking, or learning patterns for isolated component state in toggled UI

### Pumping Logging

#### `chunks/feed-logging.pumping-log-feature.md`

- **Content**: Complete pumping log implementation with UUID keys, dual amount modes (left/right or total), time range capture, local-first operations, and sync handlers
- **Read when**: Building pumping features, understanding the database schema, working with operations layer, or implementing similar two-phase or dual-mode tracking features

#### `chunks/feed-logging.pumping-modal.md`

- **Content**: AddPumpingModal component with DualTimeSwiper, AmountModeToggle, side toggle, PumpingAmountSwiper, and hook-based state management
- **Read when**: Building pumping UI, understanding modal orchestration patterns, working with amount mode switching, or implementing similar dual-mode input modals

#### `chunks/feed-logging.pumping-amount-swiper.md`

- **Content**: PumpingAmountSwiper component with visual swiper, settings popover, hand-mode support, and mode-specific settings (per-side vs. total)
- **Read when**: Implementing pumping amount input, understanding settings integration, or building similar configurable swiper components

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

#### `chunks/feed-logging.timer-save-validation.md`

- **Content**: Save button validation logic allowing sub-minute durations (< 60 seconds), Math.ceil rounding to 1 minute minimum, and user-facing confirmation flow
- **Read when**: Implementing timer validation, understanding sub-minute rounding behavior, or debugging save button enable/disable logic for breast feeds

### Activity Logs Page

#### `chunks/feed-logging.activity-logs-page.md` [EXPIRED]

- **Content**: Complete logs page implementation with filtering, view modes, unified log querying, date grouping, edit/delete modal integration, and mobile swipe-to-delete gesture
- **Read when**: Building the logs feature, implementing filter state with URL sync, understanding date grouping and view modes, working with edit modals, or implementing swipe gestures on mobile
- **Status**: Expired (LogsContent.tsx, LogItem.tsx modified on 2026-02-06). Refresh to check for changes in growth chart addition and other recent modifications.

#### `chunks/feed-logging.edit-delete-operations.md`

- **Content**: Edit/delete operations layer for feed and sleep logs with local-first sync pattern, access control, and error handling
- **Read when**: Implementing edit/delete flows, understanding operations pattern, working with outbox sync, or handling edit/delete in modal components

#### `chunks/feed-logging.log-formatting.md` [EXPIRED]

- **Content**: Formatting utilities for dates (relative), durations, times, and structured log display with left/right columns for efficient scanning
- **Read when**: Working with log display, implementing formatting logic, understanding LogItem parsing, or extending formatting for new activity types
- **Status**: Expired (LogItem.tsx modified on 2026-02-06). Refresh to check for changes.

### Growth Charts

#### `chunks/feed-logging.growth-percentile-indicators.md`

- **Content**: Real-time WHO percentile bracket indicators in AddGrowthModal with age calculation, gender validation, IndexedDB baby data integration, and layout stability patterns
- **Read when**: Working with growth measurements, understanding percentile calculations, implementing live percentile feedback, debugging age/gender validation, or extending growth tracking features

#### `chunks/feed-logging.growth-charts-recharts.md`

- **Content**: Recharts LineChart configuration with Y-axis smart tick rounding (target ~6 ticks), X-axis month coverage (0-24), tooltip label fixing (payload month extraction), percentile line styling, and responsive layout
- **Read when**: Building growth chart visualization, understanding Recharts axis configuration, fixing tooltip label issues, or implementing similar multi-line chart patterns with custom axis intervals

### Nappy Logging

#### `chunks/feed-logging.nappy-log-feature.md`

- **Content**: Complete nappy log implementation with schema (type, colour, consistency), UI components (add/edit modals, tile), sync handlers, timeline defaults, and activity filtering
- **Read when**: Working with nappy logs, implementing new instant-event activity types, understanding the pattern for zero-duration logging, or working with colour/consistency fields

#### `chunks/feed-logging.nappy-refactor-texture-consistency.md`

- **Content**: Complete refactor documentation for texture → consistency rename (January 2026), including schema changes, value mappings, IndexedDB/PostgreSQL migrations, UI updates, and checklist
- **Read when**: Implementing nappy features post-January 2026, understanding the migration path, debugging old vs. new data, or making future consistency field changes

### Solids Logging

#### `chunks/feed-logging.food-types.md`

- **Content**: User-created food type library for solids logging with offline-first create/delete operations, real-time React hook, and server sync
- **Read when**: Building food type features, implementing solids logging, understanding the operations pattern, or working with useFoodTypes hook

#### `chunks/solids.reaction-buttons.md`

- **Content**: Visual feedback component for baby's reaction to solids (Liked/Loved) with semantic color coding
- **Read when**: Working on solids logging modal, implementing reaction buttons, or changing reaction colors

### UI Patterns

#### `chunks/ui-patterns.activity-modals.md`

- **Content**: Shared modal architecture, modular component pattern, hook responsibilities, testing approach, and guide for adding new activity modals
- **Read when**: Building new activity modals (nappy, meal, medication), refactoring existing modals, understanding the modular architecture, or writing tests for modal hooks

### State Management & Reactivity

#### `chunks/ui-patterns.zustand-selector-reactivity.md`

- **Content**: Zustand selector subscription pattern for reactive component state, especially for modal button enable/disable based on timer state
- **Read when**: Implementing timer validation in modals, understanding reactive state updates, or working with Zustand subscriptions

### Query Patterns

#### `chunks/local-first.dexie-query-patterns.md`

- **Content**: Dexie query pattern fixes for chronological sorting and future log filtering in "latest" queries
- **Read when**: Querying activity logs, fixing sort order issues, or ensuring future-dated logs don't appear in UI

## Related Sections

- `.readme/sections/account-management.index.md` - Baby access control and multi-tenancy
- `.readme/sections/database.index.md` - Schema patterns and migration workflow
