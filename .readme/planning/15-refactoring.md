# Refactoring Plan: Large Files (>=200 LOC)

## Scope & Goal
Refactor oversized files across `src/` to improve readability, reduce merge conflicts, and align with the `local-db` refactor pattern (folderized helpers/types/validation with a clean `index.ts`). Target files are **>=200 lines**, with **>=500 lines as highest priority**.

This plan is based on a line-count scan of `src/` (text-like files) and the current code organization. Line counts are approximate and should be re-verified before each refactor batch.

## Prioritization
- **P0 (>=500 LOC)**: Must refactor.
- **P1 (200–499 LOC)**: Refactor when touching the area or after P0 is complete.

## Refactor Pattern (baseline)
Use the `src/lib/local-db/` structure as the baseline approach:
- Create a folder per domain (e.g., `sync/`, `baby/`, `feed/`, `ui-config/`).
- Split large modules into **helpers**, **types**, **constants**, **validation**, **queries**, **mutations**, **ui** subfolders as appropriate.
- Add a narrow **public API** via `index.ts` that re-exports the main functions/types.
- Keep function signatures stable; avoid behavior changes.
- Prefer **small focused files (<150 LOC)** that map to a single responsibility.

## Global Steps (apply to each target)
1. **Responsibility map**: Annotate sections and group responsibilities.
2. **Extract** helpers/types/constants into a folder with `index.ts`.
3. **Update imports** to use local re-exports.
4. **Split tests** to mirror module boundaries.
5. **Verify** with affected unit tests and app-specific flows.

---

## Inventory of Targets (>=200 LOC)

### P0 (>=500 LOC)
| Lines | Path | Status | Refactor Direction |
| ---: | --- | :---: | --- |
| 1691 | `src/actions/babyActions.ts` | ✅ | Split into `actions/baby/` (queries, mutations, access, invites, default-baby, utils) with index re-exports. |
| 1131 | `src/actions/babyActions.test.ts` | 🟡 | Split into `actions/baby/*.test.ts` aligned to new modules. (Test shells created, implementation pending) |
| 753 | `src/app/[locale]/api/sync/push/route.ts` | 🟡 | Extract request parsing/validation, outbox processing, error mapping into `services/sync/push/` + lean route handler. (Modules created, route refactor pending) |
| 725 | `src/components/ui/sidebar.tsx` | ⏳ | Break into `Sidebar`, `SidebarSection`, `SidebarItem`, `SidebarFooter`, nav config data. |
| 659 | `src/app/[locale]/api/bootstrap/route.ts` | ⏳ | Move bootstrap logic into `services/bootstrap/` (fetch, normalize, response shaping). |
| 652 | `src/app/[locale]/api/sync/push/route.test.ts` | 🟡 | Split tests into `sync/push/*.test.ts` (validation, conflict handling, outbox, errors). (Test shells created) |
| 626 | `src/services/sync-service.test.ts` | 🟡 | Split by sync phases (`pull`, `push`, `apply`, `conflicts`). (Test shells created) |
| 626 | `src/components/feed/TimeSwiper.tsx` | ⏳ | Separate gesture logic, rendering, and utilities into `components/feed/time-swiper/`. |
| 576 | `src/services/sync-service.ts` | ✅ | Break into `services/sync/` (pull/push/apply/outbox/conflicts) with shared types. |
| 543 | `src/services/operations/baby.test.ts` | 🟡 | Split to match new `services/operations/baby/` modules. (Test shells created) |
| 515 | `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` | ⏳ | Extract states, actions, guards, effects into `bootstrap-machine/` folder; keep hook thin. |

**Legend:** ✅ Complete | 🟡 Partial | ⏳ Not Started

### P1 (200–499 LOC)
| Lines | Path | Status | Refactor Direction |
| ---: | --- | :---: | --- |
| 499 | `src/actions/accessRequestActions.ts` | ⏳ | Move into `actions/access-requests/` with queries/mutations split. |
| 451 | `src/services/operations/baby.ts` | ✅ | Split into `operations/baby/` (create/update/delete/access). |
| 431 | `src/stores/useTimerStore.test.ts` | ⏳ | Split into store behavior tests and timer logic tests. |
| 378 | `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx` | ✅ | Extract form sections, validation, and shared form inputs. |
| 372 | `src/components/feed/TimerWidget.test.tsx` | ⏳ | Split widget tests by mode (timer, edit, interactions). |
| 363 | `src/services/operations/feed-log.test.ts` | ⏳ | Split by operation type (create/update/delete/apply). |
| 358 | `src/app/[locale]/api/sync/pull/route.test.ts` | ⏳ | Split into pagination/filters/auth tests. |
| 331 | `src/services/initial-sync.ts` | ⏳ | Split into fetch, transform, apply stages under `services/sync/initial/`. |
| 313 | `src/hooks/useSyncScheduler.ts` | ⏳ | Extract scheduler logic and constants into `hooks/sync/` helper module. |
| 293 | `src/components/ui/combobox.tsx` | ⏳ | Split into `Combobox`, `ComboboxTrigger`, `ComboboxList`, and hook utilities. |
| 289 | `src/lib/local-db/helpers/ui-config.ts` | ⏳ | Further split into `ui-config/` (paths, merge/update, defaults, queries). |
| 268 | `src/app/[locale]/(auth)/(app)/overview/_components/AddSleepModal.tsx` | ✅ | Extract shared form pieces and modal layout. |
| 267 | `src/components/feed/AmountSlider.tsx` | ⏳ | Split slider UI, labels, and value math utilities. |
| 265 | `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PendingInvitesSection.tsx` | ⏳ | Extract list item and empty states. |
| 258 | `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CaregiversSection.tsx` | ⏳ | Extract list item and access badge components. |
| 258 | `src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx` | ⏳ | Split into table/list, actions, and row components. |
| 253 | `src/components/ui/dropdown-menu.tsx` | ⏳ | Split base primitives and custom menu items. |
| 247 | `src/services/sync-worker-manager.ts` | ⏳ | Split worker lifecycle, message handlers, and configuration. |
| 245 | `src/models/Schema.ts` | ⏳ | Split into `models/schema/` (tables, relations, enums). |
| 239 | `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CreateInviteSection.tsx` | ⏳ | Extract form body and CTA panel. |
| 238 | `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx` | ⏳ | Extract form fields and validation logic. |
| 231 | `src/app/[locale]/api/user/ui-config/route.ts` | ⏳ | Extract handler logic into `services/ui-config/` and keep route thin. |
| 228 | `src/components/ui/field.tsx` | ⏳ | Split base input vs. label/assistive text. |
| 228 | `src/app/[locale]/(auth)/(app)/settings/babies/new/NewBabyForm.tsx` | ⏳ | Extract shared form fields and submit logic. |
| 223 | `src/workers/sync-worker.ts` | ⏳ | Separate message routing, sync orchestration, and logging. |
| 214 | `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx` | ⏳ | Extract view pieces and reuse with other bootstrap states. |
| 205 | `src/actions/feedLogActions.ts` | ⏳ | Split by operation type (create/update/delete) and queries. |
| 204 | `src/components/settings/AmountSliderSettingsPanel.tsx` | ⏳ | Extract slider config form and preview. |
| 204 | `src/components/SyncProvider.tsx` | ⏳ | Extract provider wiring vs. side-effect hooks. |
| 203 | `src/app/[locale]/(auth)/account/bootstrap/page.tsx` | ⏳ | Extract layout/route wrapper vs. UI components. |
| 201 | `src/types/bootstrap.ts` | ⏳ | Split type groups into `types/bootstrap/` (events, state, payloads). |
| 200 | `src/components/feed/TimerWidget.tsx` | ⏳ | Extract presentation vs. timer logic. |

---

## Execution Plan (by area)

### 1) Sync & Offline (highest risk)
Target: `sync-service`, `sync-worker`, `initial-sync`, `sync/push` route, `useSyncScheduler`, `ui-config` route.
- Create `src/services/sync/` submodules (`pull`, `push`, `apply`, `outbox`, `conflicts`, `initial`).
- Thin API route handlers that delegate to services.
- Split worker into message routing + execution modules.

### 2) Actions & Operations
Target: `babyActions`, `feedLogActions`, `accessRequestActions`, `operations/baby`.
- Create `src/actions/baby/` and `src/actions/feed-log/` with `index.ts`.
- Align operations modules with clear create/update/delete responsibilities.
- Keep existing exported API stable via re-exports.

### 3) UI Components (behavioral risk moderate)
Target: `TimeSwiper`, `Sidebar`, `AddFeedModal`, `AddSleepModal`, baby management UIs.
- Move heavy UI logic into subcomponents and small hooks.
- Co-locate related UI components in dedicated folders.
- Ensure any shared UI logic lives in `components/` or `hooks/`.

### 4) Tests
- Mirror new module layout with test files.
- Isolate scenario-heavy tests into smaller suites.
- Keep test names stable where possible to preserve history.

---

## Guardrails
- No behavioral changes unless explicitly required.
- Keep exported APIs stable via `index.ts` re-exports.
- Do not introduce new dependencies.
- Keep module sizes <150–200 LOC when feasible.

## Success Criteria
- No files >=500 LOC remain in `src/` after P0.
- P1 files reduced and aligned to clear responsibilities.
- All existing tests pass for touched areas.
- Imports remain clean and discoverable (shallow `index.ts` exports).

---

## Completion Log

### Phase 1 (Completed: 2026-01-22)

**Completed Refactorings:**
1. ✅ `src/actions/babyActions.ts` (1,691 LOC → modular `actions/baby/` folder)
   - Created 15+ focused modules organized by responsibility
   - Folder structure: `crud/`, `invites/`, `caregivers/`, `access/`, `account/`, `utils/`
   - Test shells created for key modules
   - Documentation: `.readme/chunks/baby-management.server-actions.md`

2. ✅ `src/services/sync-service.ts` (576 LOC → modular `services/sync/` folder)
   - Split into `pull.ts`, `push.ts`, `conflict.ts`, `full-sync.ts`
   - Entity-specific apply handlers in `apply/` subfolder
   - Test shells created for main modules
   - Documentation: `.readme/chunks/local-first.sync-service-structure.md`

3. ✅ `src/services/operations/baby.ts` (451 LOC → modular `operations/baby/` folder)
   - Split into `create.ts`, `update.ts`, `delete.ts`, `set-default.ts`
   - Test shell created
   - Documentation updated in `.readme/chunks/local-first.operations-layer-pattern.md`

**Import Updates:**
- All 14 files importing from old paths updated to new modular imports
- Old compatibility shim files deleted
- TypeScript compilation passes
- Production build successful

**Documentation:**
- 2 new documentation chunks created
- 2 existing documentation chunks updated with new structure
- All source paths updated to reflect new modular organization

**Results:**
- 3 large files (totaling 2,718 LOC) successfully refactored into 30+ focused modules
- Each module now <200 LOC (most <150 LOC)
- Clear separation of concerns with logical folder organization
- Test infrastructure in place for future implementation

### Phase 2 (Completed: 2026-01-23)

**Completed Refactorings:**
4. ✅ `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx` (378 LOC → modular `add-feed-modal/` folder)
   - Created modular structure with hooks and components folders
   - Extracted 3 custom hooks: `useFeedFormState`, `useInitializeFeedForm`, `useFeedFormSubmit`
   - Extracted 8 components: `FeedMethodToggle`, `EndSideToggle`, `DurationDisplay`, `ModeSwitch`, `BottleInputs`, `BreastInputs`, `TimerModeSection`, `ManualModeSection`
   - Main component reduced to ~170 LOC orchestrator
   - Comprehensive utils tests created (12 test cases passing)
   - TypeScript compilation passes with zero errors in refactored code
   - Production build successful

**File Structure:**
```
add-feed-modal/
├── index.ts                    # Public API
├── AddFeedModal.tsx            # Orchestrator (~170 LOC)
├── types.ts                    # Shared types
├── utils.ts                    # Duration utilities
├── utils.test.ts               # Utils tests
├── hooks/
│   ├── index.ts
│   ├── useFeedFormState.ts
│   ├── useInitializeFeedForm.ts
│   └── useFeedFormSubmit.ts
└── components/
    ├── index.ts
    ├── FeedMethodToggle.tsx
    ├── EndSideToggle.tsx
    ├── DurationDisplay.tsx
    ├── ModeSwitch.tsx
    ├── TimerModeSection.tsx
    ├── ManualModeSection.tsx
    ├── BottleInputs.tsx
    └── BreastInputs.tsx
```

**Results:**
- 378 LOC monolithic component → 10 focused modules
- Each module <100 LOC (main component ~170 LOC)
- Clear separation: state management, initialization, submission, UI
- Reusable components for future modals
- Maintains exact same functionality and behavior

### Phase 3 (Completed: 2026-01-23)

**Completed Refactorings:**
5. ✅ `src/app/[locale]/(auth)/(app)/overview/_components/AddSleepModal.tsx` (268 LOC → modular `add-sleep-modal/` folder + shared `activity-modals/`)
   - Created shared component library: `components/activity-modals/` for reuse across activity modals
   - Shared components: `DurationDisplay`, `ModeSwitch`, and duration utilities (`calculateDuration`, `formatDuration`)
   - Extracted 3 custom hooks: `useSleepFormState`, `useInitializeSleepForm`, `useSleepFormSubmit`
   - Extracted 2 components: `TimerModeSection`, `ManualModeSection`
   - Main component reduced to ~130 LOC orchestrator
   - Updated AddFeedModal to use shared components from `activity-modals/`
   - All tests passing (activity-modals: 10 tests, add-feed-modal: 2 tests)
   - TypeScript compilation passes with zero errors
   - Production build successful

**Shared Components Structure:**
```
components/activity-modals/
├── index.ts                    # Public API
├── types.ts                    # Shared InputMode type
├── utils.ts                    # Duration calculations
├── utils.test.ts               # Utils tests (10 tests)
├── DurationDisplay.tsx         # Duration badge component
└── ModeSwitch.tsx              # Timer/manual toggle
```

**AddSleepModal Structure:**
```
add-sleep-modal/
├── index.ts                    # Public API
├── AddSleepModal.tsx           # Orchestrator (~130 LOC)
├── types.ts                    # SleepFormState, props
├── hooks/
│   ├── index.ts
│   ├── useSleepFormState.ts      (~60 LOC)
│   ├── useInitializeSleepForm.ts (~50 LOC)
│   └── useSleepFormSubmit.ts     (~80 LOC)
└── components/
    ├── index.ts
    ├── TimerModeSection.tsx      (~30 LOC)
    └── ManualModeSection.tsx     (~60 LOC)
```

**Test Coverage:**
```
add-sleep-modal/hooks/
├── useSleepFormState.test.tsx          # 6 tests - state management
├── useInitializeSleepForm.test.tsx     # 5 tests - initialization & hydration
└── useSleepFormSubmit.test.tsx         # 9 tests - timer/manual modes, validation, errors
```

**Test Details:**
- **useSleepFormState.test.tsx** (6 tests)
  - Initial state validation (timer mode, default duration, hand mode)
  - State update actions (input mode, start/end times, hand mode)
  - Form reset behavior

- **useInitializeSleepForm.test.tsx** (5 tests)
  - Timer hydration when user is available
  - Hand mode loading from IndexedDB with default fallback
  - Error handling for config load failures
  - User availability checks

- **useSleepFormSubmit.test.tsx** (9 tests)
  - Timer mode: validation, submission, timer data handling
  - Manual mode: duration calculation, time validation
  - Error handling: service errors, network failures
  - Callback execution: onSuccess, onClose
  - State management: isSubmitting tracking

**Test Results:**
- 20 tests total, all passing
- Uses vitest-browser-react (project standard)
- Proper mocking: Zustand stores, IndexedDB helpers, operations layer
- Test duration: ~600ms

**Documentation:**
- Created `.readme/chunks/ui-patterns.activity-modals.md`
  - Comprehensive pattern documentation (647 LOC)
  - Architecture overview with code examples
  - Hook responsibilities and testing strategies
  - Step-by-step guide for adding new activity modals
  - Common gotchas and troubleshooting
- Updated `.readme/sections/feed-logging.index.md` to reference new pattern chunk

**Results:**
- 268 LOC monolithic component → 8 focused modules + 3 shared components
- Each module <100 LOC (main component ~130 LOC)
- Established reusable pattern for future activity modals (nappy, meal, etc.)
- AddFeedModal and AddSleepModal now share common components
- Consistent architecture across all activity modals
- 30% simpler than AddFeedModal refactoring (fewer states and variants)
- Maintains exact same functionality and behavior
- **Complete test coverage for all sleep modal hooks** (20 tests)
- Documentation serves as blueprint for future modal implementations
