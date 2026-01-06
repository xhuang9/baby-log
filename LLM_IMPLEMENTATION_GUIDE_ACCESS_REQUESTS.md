# LLM Implementation Guide: Baby Access Requests (In-app Approval)

Goal: let a user with no babies request access by email, and require the recipient to explicitly approve in-app.

## Data Model Changes

Add a new table `baby_access_requests`:
- id (serial PK)
- requesterUserId (FK -> user.id)
- targetEmail (text, lowercased)
- targetUserId (FK -> user.id, nullable; set when email matches an existing user)
- requestedAccessLevel (enum access_level_enum, default "viewer")
- message (text, nullable)
- status enum: `pending | approved | rejected | canceled`
- resolvedBabyId (FK -> babies.id, nullable)
- resolvedByUserId (FK -> user.id, nullable)
- resolvedAt (timestamp, nullable)
- createdAt / updatedAt

Indexes:
- index on `targetEmail`
- index on `targetUserId`
- unique on (`requesterUserId`, `targetEmail`, `status`) to prevent duplicate pending requests

## UI and Routes (Shadcn + Default Tailwind)

Use existing components in `src/components/ui` (maia/teal style, default Tailwind classes).

Requester (no babies):
- `/account/request-access`
  - Layout: `Card` with title + description, form inside `Field` + `Input` + `Textarea` + `Select`.
  - Submit shows "Request sent" and lists pending requests in a `Card` list with `Badge` + `Button` (Cancel).
  - Secondary action: "Create a baby" link back to `/account/onboarding/baby`.

Onboarding entry:
- `/account/onboarding/baby` shows a secondary "Request access" ghost `Button` linking to `/account/request-access`.

Recipient approval (in-app popup):
- `/account/shared` loads pending incoming requests and opens a `Dialog` by default if any exist.
  - Dialog content: requester name/email, optional message, `Select` for baby, `Select` for access level, `Button` for Approve/Reject.
  - Keep a non-blocking list below using `Card` + `Badge`.

Owner management:
- `/settings/babies/share`
  - Section "Access requests" reuses the same list UI and opens the same `Dialog` when a row is clicked.

## Server Actions / API Handlers

Requester:
- `createAccessRequest`
  - Normalize targetEmail to lowercase.
  - Look up existing user by email; set `targetUserId` if found.
  - Reject if targetEmail equals requester's email.
  - Enforce single pending request per (requesterUserId, targetEmail).
  - Return a generic success message.
- `cancelAccessRequest`
  - Status -> canceled (only by requester).

Recipient:
- `listIncomingRequests`
  - Filter by `targetUserId = currentUserId` or `targetEmail = user.email`.
- `approveAccessRequest`
  - Require status = pending and recipient is target.
  - Create `baby_access` row for requester.
  - Update request status to approved + resolvedBabyId/resolvedByUserId/resolvedAt.
  - If requester has no default baby, set `user.defaultBabyId`.
- `rejectAccessRequest`
  - Status -> rejected + resolvedByUserId/resolvedAt.

## Resolve Flow Updates

`/account/resolve`:
- If user has no babies and has a pending outgoing request, redirect to `/account/request-access`.
- If user has incoming requests, redirect to `/account/shared`.
- If a request was approved and user now has access, proceed with normal default baby selection.

## Validation Rules

- targetEmail must be a valid email.
- requester and recipient must be authenticated.
- recipient must match `targetUserId` or `targetEmail`.
- requester cannot approve their own request.
- all updates must verify status = pending.

## Implementation Steps

1) Update `src/models/Schema.ts` with `baby_access_requests`.
2) Generate/apply migrations with `pnpm run db:generate` and `pnpm run db:migrate`.
3) Add `/account/request-access` page with shadcn form + pending list.
4) Add `/account/shared` with a `Dialog` approval UI for incoming requests.
5) Add actions/handlers for create, cancel, list, approve, reject.
6) Update `/account/onboarding/baby` to link to request access.
7) Update `/account/resolve` routing rules.
8) Update `/settings/babies/share` to list incoming requests and open approval dialog.
9) Add tests: request creation, recipient approval, requester sees approved access on next login.

Notes:
- Keep responses `no-store` and do not cache request lists in the service worker.
- Use existing Zod + react-hook-form patterns and shadcn components (`Card`, `Field`, `Input`, `Textarea`, `Select`, `Button`, `Badge`, `Dialog`).
