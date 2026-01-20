# Pre-Execution Review Scope

Use this list before implementation to avoid filesystem scanning.

## Database + Migrations
- `src/models/Schema.ts`
- `migrations/`
- `drizzle.config.ts`

## Bootstrap API + State Machine
- `src/app/[locale]/api/bootstrap/route.ts`
- `src/app/[locale]/(auth)/account/bootstrap/page.tsx`
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts`
- `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx`
- `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapInvites.tsx`
- `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapPendingRequest.tsx`

## Server Actions + Services
- `src/actions/babyActions.ts`
- `src/actions/accessRequestActions.ts`
- `src/services/baby-access.ts`

## Settings UI (Owner Sharing)
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyContent.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/page.tsx`

## Types + Stores
- `src/types/bootstrap.ts`
- `src/stores/useBabyStore.ts`
- `src/stores/useUserStore.ts`

## Tests
- `src/actions/babyActions.test.ts`
- `src/actions/accessRequestActions.test.ts`
- `tests/`
- `src/app/[locale]/api/*` (invite-related test endpoints, if any)
