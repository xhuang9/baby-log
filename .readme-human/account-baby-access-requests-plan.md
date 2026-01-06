# Baby Access Requests Plan (In-App Approval)

## Goals
- Enable users without babies to request access from existing baby owners via email.
- Require explicit in-app approval by the recipient (no auto-accept links).
- Support pending request tracking, approval/rejection workflow, and cancellation.
- Integrate with existing account resolution flow and baby selection.

## Data Model Changes (Proposed)

### baby_access_requests (new)
- `id` (serial PK)
- `requesterUserId` (FK -> user.id, not null)
- `targetEmail` (text, not null, lowercased)
- `targetUserId` (FK -> user.id, nullable; set when email matches an existing user)
- `requestedAccessLevel` (enum access_level_enum, default "viewer")
- `message` (text, nullable; optional message from requester)
- `status` (enum: `pending | approved | rejected | canceled`)
- `resolvedBabyId` (FK -> babies.id, nullable; set on approval)
- `resolvedByUserId` (FK -> user.id, nullable; who approved/rejected)
- `resolvedAt` (timestamp, nullable; when approved/rejected)
- `createdAt` (timestamp, not null, default now())
- `updatedAt` (timestamp, not null, default now())

Indexes:
- Index on `targetEmail` (for recipient lookup)
- Index on `targetUserId` (for user-based queries)
- Index on `requesterUserId` (for requester's outgoing requests)
- Index on `status` (for filtering pending requests)
- Unique constraint on (`requesterUserId`, `targetEmail`, `status`) where `status = 'pending'` (prevent duplicate pending requests)

Notes:
- Always lowercase `targetEmail` before insert/query.
- Set `targetUserId` on creation if a user with that email exists.
- Update `targetUserId` dynamically if a new user signs up with the email later.
- On approval, create `baby_access` row and optionally set `user.defaultBabyId` for requester.

## Flow Overview (Decision Tree)

```
/account/resolve (existing flow):
  -> if user has no babies:
      -> if has pending OUTGOING requests => /account/request-access
      -> if has pending INCOMING requests => /account/shared (show approval dialog)
      -> else => /account/onboarding/baby

/account/request-access:
  -> requester submits (email + optional message + access level)
      -> creates baby_access_request row
      -> shows pending requests list
      -> link to "Create a baby" as alternative

/account/shared:
  -> if has pending incoming requests => auto-open Dialog approval UI
  -> Dialog:
      -> shows requester name/email, message, select baby, select access level
      -> Approve => create baby_access + update request status + set default baby if needed
      -> Reject => update request status to rejected

/settings/babies/share:
  -> shows "Access requests" section with same list + Dialog UI
```

## Scenario Handling
- **First-time user, no babies**: Can request access OR create their own baby (dual options).
- **Requester pending**: Shows list of pending requests with Cancel button; can send multiple to different emails.
- **Recipient receives request**: Gets notified in-app at `/account/shared` or `/settings/babies/share`; must choose baby and access level before approving.
- **Approved request**: Requester gains access on next login via `/account/resolve` flow.
- **Rejected request**: Marked as rejected; requester can see status and create new request.
- **Canceled request**: Requester can cancel their own pending requests.
- **Duplicate prevention**: Only one pending request per (requester, target email) pair.
- **Self-request prevention**: Cannot request access from your own email.

## UI Components and Routes (Shadcn + Tailwind)

### Requester Pages

#### `/account/request-access`
Layout: Centered card layout (similar to `/account/onboarding/baby`)

**Form Section:**
- `Card` with title "Request Baby Access"
- `Field` + `Input` for target email (required, validated)
- `Field` + `Textarea` for optional message (e.g., "Hi! I'd like to help track baby's milestones.")
- `Field` + `Select` for requested access level (viewer | editor | admin)
- `Button` type="submit" variant="default": "Send Request"
- Secondary `Button` variant="ghost" linking to `/account/onboarding/baby`: "Or create your own baby"

**Pending Requests Section:**
- Heading "Your Pending Requests"
- List of `Card` components with:
  - `Badge` showing status (pending)
  - Target email
  - Requested access level
  - Created date
  - `Button` variant="outline" size="sm": "Cancel" (triggers `cancelAccessRequest`)

#### `/account/onboarding/baby` (existing, modified)
Add:
- Below main form, a secondary `Button` variant="ghost": "Request access to an existing baby instead" linking to `/account/request-access`

### Recipient Pages

#### `/account/shared` (existing, modified)
Add:
- On page load, check for pending incoming requests
- If any exist, auto-open `Dialog` with first request
- `Dialog` content:
  - Title: "Access Request from [Name/Email]"
  - Display requester name (if user exists) or email
  - Optional message display (if provided)
  - `Field` + `Select` for baby selection (list accessible babies where user is owner)
  - `Field` + `Select` for access level (viewer | editor | admin; default to requested level)
  - `Button` variant="default": "Approve" (triggers `approveAccessRequest`)
  - `Button` variant="outline": "Reject" (triggers `rejectAccessRequest`)
  - Close button to dismiss and review later

**Non-Dialog List:**
- Below invites section, add "Access Requests" section
- List of `Card` components with:
  - Requester info (name or email)
  - `Badge` showing status
  - Optional message preview (truncated)
  - Created date
  - Click to open same `Dialog` for approval

#### `/settings/babies/share` (existing, modified)
Add:
- New section "Incoming Access Requests"
- Same list UI as `/account/shared` with `Card` + `Badge`
- Click row to open same approval `Dialog`

## Server Actions / API Handlers

### Requester Actions

#### `createAccessRequest(data: { targetEmail, message?, requestedAccessLevel })`
Input validation:
- targetEmail: valid email format, lowercase normalized
- message: max 500 chars (optional)
- requestedAccessLevel: enum validation

Logic:
1. Get current user (Clerk auth required)
2. Normalize targetEmail to lowercase
3. Reject if targetEmail === currentUser.email (cannot request from self)
4. Look up existing user by email; set targetUserId if found
5. Check for existing pending request (requesterUserId, targetEmail, status=pending)
   - If exists, return error "You already have a pending request to this email"
6. Insert baby_access_request row with status=pending
7. Return success message (no PII)

Return:
```ts
{ success: true, message: "Access request sent successfully" }
```

#### `cancelAccessRequest(requestId: number)`
Input validation:
- requestId: number

Logic:
1. Get current user
2. Find request by id where requesterUserId = currentUser.id
3. Verify status = pending (cannot cancel approved/rejected)
4. Update status to canceled, set resolvedAt to now
5. Return success

Return:
```ts
{ success: true }
```

#### `listOutgoingRequests()`
Logic:
1. Get current user
2. Query baby_access_requests where requesterUserId = currentUser.id
3. Order by createdAt desc
4. Return list with target email, status, createdAt, requestedAccessLevel

Return:
```ts
{ requests: Array<{ id, targetEmail, status, requestedAccessLevel, createdAt, message? }> }
```

### Recipient Actions

#### `listIncomingRequests()`
Logic:
1. Get current user
2. Query baby_access_requests where:
   - targetUserId = currentUser.id OR targetEmail = currentUser.email
   - status = pending
3. Join with user table to get requester name
4. Order by createdAt desc
5. Return list

Return:
```ts
{
  requests: Array<{
    id,
    requesterName?,
    requesterEmail,
    message?,
    requestedAccessLevel,
    createdAt
  }>
}
```

#### `approveAccessRequest(requestId: number, data: { babyId, accessLevel })`
Input validation:
- requestId: number
- babyId: must exist and user must have owner access
- accessLevel: enum validation

Logic:
1. Get current user
2. Find request by id where (targetUserId = currentUser.id OR targetEmail = currentUser.email) AND status = pending
3. Verify user has owner access to selected babyId
4. Check if requester already has access to this baby
   - If exists, return error "User already has access to this baby"
5. Begin transaction:
   a. Create baby_access row:
      - userId: request.requesterUserId
      - babyId: selected babyId
      - accessLevel: selected accessLevel
      - caregiverLabel: null (requester can set later)
      - lastAccessedAt: now()
   b. Update baby_access_request:
      - status = approved
      - resolvedBabyId = selected babyId
      - resolvedByUserId = currentUser.id
      - resolvedAt = now()
   c. If requester.defaultBabyId is null, set to selected babyId
6. Commit transaction
7. Return success

Return:
```ts
{ success: true, message: "Access granted successfully" }
```

#### `rejectAccessRequest(requestId: number)`
Input validation:
- requestId: number

Logic:
1. Get current user
2. Find request by id where (targetUserId = currentUser.id OR targetEmail = currentUser.email) AND status = pending
3. Update request:
   - status = rejected
   - resolvedByUserId = currentUser.id
   - resolvedAt = now()
4. Return success

Return:
```ts
{ success: true }
```

## Validation Rules (Server-Side)

1. **Auth guard**: All actions require authenticated Clerk user.
2. **Email validation**: targetEmail must be valid email format.
3. **Self-request prevention**: Cannot request access from own email.
4. **Duplicate prevention**: Unique constraint on (requesterUserId, targetEmail, status=pending).
5. **Status transitions**:
   - pending -> approved (only by recipient)
   - pending -> rejected (only by recipient)
   - pending -> canceled (only by requester)
6. **Approval requirements**:
   - Recipient must have owner access to selected baby.
   - Cannot approve if requester already has access to baby.
7. **Access level validation**: Must be one of: viewer | editor | admin.
8. **Request ownership**:
   - Only requester can cancel their own requests.
   - Only recipient (by userId or email) can approve/reject.

## Integration with Existing Flows

### `/account/resolve` Updates
Add to decision tree (after user upsert, before baby resolution):

```ts
// After user sync
if (user.babies.length === 0) {
  // Check for outgoing pending requests
  const outgoingRequests = await getOutgoingRequests(user.id);
  if (outgoingRequests.some(r => r.status === 'pending')) {
    return redirect('/account/request-access');
  }

  // Check for incoming pending requests
  const incomingRequests = await getIncomingRequests(user.id, user.email);
  if (incomingRequests.length > 0) {
    return redirect('/account/shared');
  }

  // No requests, go to onboarding
  return redirect('/account/onboarding/baby');
}

// Continue with existing baby resolution logic
```

### `/account/shared` Updates
- On mount, fetch incoming requests
- If any pending, auto-open approval Dialog
- Show non-blocking list below invites section
- After approval, refresh baby list and potentially redirect to dashboard

### `/settings/babies/share` Updates
- Add "Incoming Access Requests" section above "Share a Baby" form
- Use same list + Dialog UI as `/account/shared`
- Show count badge if pending requests exist

## Status Messaging (Examples)
- `/account/request-access`: "Sending access request..." → "Request sent successfully"
- Approve action: "Granting access..." → "Access granted successfully"
- Reject action: "Rejecting request..." → "Request rejected"
- Cancel action: "Canceling request..." → "Request canceled"

## Storage Strategy (PWA)

sessionStorage:
- `baby-log:access-requests-cache` (optional, short-lived cache for pending requests count)

Database:
- All request data, status, and metadata.

API Responses:
- Set `Cache-Control: no-store` for all access request endpoints (user-specific data).

## Background Jobs (Optional Future Enhancement)

### Email Notifications (Future)
- When request created: notify recipient by email (if targetUserId exists)
- When request approved: notify requester by email
- When request rejected: notify requester by email

### Auto-Update targetUserId (Future)
- Background job to check for new users matching pending request emails
- Update `targetUserId` when new user signs up with matching email

## Security Considerations

1. **Rate limiting**: Limit request creation (e.g., max 5 pending requests per user).
2. **Email enumeration prevention**: Do not reveal if target email has an account.
3. **Authorization checks**: Always verify ownership before approval/rejection.
4. **XSS prevention**: Sanitize message field display (use text-only rendering).
5. **CSRF protection**: Use Next.js server actions with built-in CSRF tokens.

## Testing Scenarios

1. **Requester creates request**: Submit form, verify DB insert, see in pending list.
2. **Duplicate prevention**: Try creating duplicate request, expect error.
3. **Self-request prevention**: Try requesting from own email, expect error.
4. **Recipient sees request**: Log in as target user, see request in `/account/shared`.
5. **Approval flow**: Approve request, verify baby_access created, verify status updated.
6. **Rejection flow**: Reject request, verify status updated to rejected.
7. **Cancellation flow**: Requester cancels own request, verify status updated.
8. **Default baby assignment**: Approve request for user with no default, verify defaultBabyId set.
9. **Access resolution**: Approved requester logs in, resolves to dashboard with new baby access.
10. **Wrong recipient**: Try to approve request not addressed to you, expect error.
