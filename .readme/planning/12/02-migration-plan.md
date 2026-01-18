# Migration Plan and Inventory

## Phase 0: Audit (Baseline)

Run these searches to locate remaining write paths:

```bash
rg -n "@/actions" src/app src/components src/hooks
rg -n "localDb\." src/app src/components src/hooks
rg -n "updateUIConfig" src/app src/components src/hooks
```

Goal: components should not call server actions or Dexie writes directly.

---

## Scope Audit: Overview + Settings (DB Writes)

### Overview page write paths

- [ ] `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx`: replace `createFeedLog(...)` server action with an operation (local write + outbox enqueue + optional flush).
- [ ] `src/components/feed/TimeSwiper.tsx`: replace `updateUIConfig(userId, { timeSwiper })` with an operation (UI config mutation).
- [ ] `src/components/feed/AmountSlider.tsx`: replace `updateUIConfig(userId, { amountSlider })` with an operation (UI config mutation).

### Settings page write paths

- [ ] `src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx`: replace `updateUIConfig(userId, { theme })` with an operation.
- [ ] `src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx`: replace `updateUIConfig(userId, { handMode })` with an operation.
- [ ] `src/app/[locale]/(auth)/(app)/settings/_components/TimeSwiperSettings.tsx`: use a settings operation instead of `useWidgetSettings` -> `updateUIConfig`.
- [ ] `src/app/[locale]/(auth)/(app)/settings/_components/AmountSliderSettings.tsx`: use a settings operation instead of `useWidgetSettings` -> `updateUIConfig`.
- [ ] `src/hooks/useWidgetSettings.ts`: migrate internal persistence from `updateUIConfig` to operations (debounced + immediate saves).
- [ ] `src/app/[locale]/(auth)/(app)/settings/babies/new/NewBabyForm.tsx`: replace `createBaby(...)` server action with an operation.
- [ ] `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx`: replace `updateBaby(...)` + `localDb.*` writes with a single operation.
- [ ] `src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx`: replace `setDefaultBaby(...)` server action with an operation.

---

## Phase 1: Scaffold Operations Layer

- Create `src/services/operations/` with `types.ts` and `index.ts`.
- Add a shared helper for outbox enqueue (mutationId, entityType, payload).
- Add a small wrapper to update Zustand lists safely (no React hooks).

---

## Phase 2: Baby Mutations (First Vertical Slice)

Target files:

- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx`
- `src/components/navigation/BabySwitcher.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/new/NewBabyForm.tsx`
- `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx`
- `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapInvites.tsx`
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts`

Tasks:

- Add operations: `updateBabyProfile`, `setDefaultBaby`, `createBaby`.
- Replace direct `updateBaby` / `setDefaultBaby` / `createBaby` calls in UI.
- Extend sync push + applyChange/applyServerData to support `baby` updates.
- Decide create strategy (server-generated ID vs temp ID + reconciliation).

---

## Phase 3: Log Mutations

Target files:

- `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx`

Tasks:

- Add operations: `createFeedLog` (local write + outbox enqueue).
- Replace server action usage in UI with operations.

---

## Phase 4: UI Config + Settings

Target files:

- `src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx`
- `src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx`
- `src/components/feed/TimeSwiper.tsx`
- `src/components/feed/AmountSlider.tsx`
- `src/hooks/useWidgetSettings.ts`

Tasks:

- Add operations: `updateTheme`, `updateHandMode`, `updateWidgetSettings`.
- Replace `updateUIConfig` calls in UI/hook with operations.

---

## Phase 5: Auth + Cleanup

Target files:

- `src/components/auth/SignOutButton.tsx`

Tasks:

- Add operation: `signOutCleanup` (clears stores + auth session).
- Replace direct local-db usage in component.

---

## Phase 6: Validation and Tests

- Add unit tests for high-value operations (baby update, feed log create).
- Verify outbox enqueue payloads and store updates.
- Ensure sync flush still works and data is pulled after push.

---

## Done When

- `rg -n "@/actions" src/app src/components src/hooks` returns **types-only** imports.
- `rg -n "localDb\." src/app src/components src/hooks` returns **no write calls**.
- All write actions flow through `src/services/operations`.
