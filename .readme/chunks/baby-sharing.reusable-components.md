---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/components/baby-access/JoinWithCodeSection.tsx
  - src/components/baby-access/RequestAccessSection.tsx
  - src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/new/NewBabyForm.tsx
---

# Reusable Baby Access Components

## Purpose
Provides two self-contained, reusable components for joining baby access and requesting access, used in both bootstrap and settings contexts.

## Components Overview

### 1. JoinWithCodeSection
**Purpose:** Accept invite using 6-digit passkey code

**Usage contexts:**
- Bootstrap (no baby state) - primary use case
- Settings (add another baby) - future use case

### 2. RequestAccessSection
**Purpose:** Send access request to existing caregiver by email

**Usage contexts:**
- Bootstrap (no baby state) - primary use case
- Settings (request access to specific baby) - future use case

## JoinWithCodeSection Component

**File:** `src/components/baby-access/JoinWithCodeSection.tsx`

**Props:**
```typescript
type JoinWithCodeSectionProps = {
  redirectPath: string;      // Where to redirect after success
  onSuccess?: () => void;    // Optional callback before redirect
};
```

**UI Pattern:**
- Collapsible section (starts closed)
- "Have a caregiver code?" header button
- Expands to show 6-digit OTP input
- Inline error display
- Submit button (disabled until 6 digits entered)

**Input component:** `InputOTP` with `InputOTPGroup` + `InputOTPSlot`
- Numeric-only keyboard on mobile
- Auto-advance between digits
- Paste support (6-digit codes)

**Flow:**
1. User enters/pastes 6 digits
2. Client validates length
3. Calls `acceptInviteByCode({ code })` server action
4. On success:
   - Updates `useBabyStore` with new baby
   - Calls `onSuccess()` callback if provided
   - Redirects to `redirectPath` (using `router.replace`)

**Why `replace` not `push`:** Prevents back button returning to join form (better UX).

**Example usage (Bootstrap):**
```typescript
<JoinWithCodeSection
  redirectPath="/account/bootstrap"
  onSuccess={() => console.log('Joined successfully')}
/>
```

**Error handling:**
```typescript
if (!result.success) {
  setJoinCodeError(result.error);
  return; // Stay on form
}
```

**Common errors:**
- "Code must be exactly 6 digits" (client validation)
- "Invalid or expired code" (server)
- "Invite already used" (server)
- "You already have access" (server)

## RequestAccessSection Component

**File:** `src/components/baby-access/RequestAccessSection.tsx`

**Props:**
```typescript
type RequestAccessSectionProps = {
  redirectPath: string;      // Where to redirect after success
  onSuccess?: () => void;    // Optional callback before redirect
};
```

**UI Pattern:**
- Collapsible section (starts closed)
- "Request access from someone" header button
- Expands to show email form with optional message
- Success state shows confirmation (2-second delay before redirect)
- "Send Another Request" button resets form

**Form fields:**
1. **Target Email** (required)
   - Email input with validation
   - Placeholder: "caregiver@example.com"
   - Help text: "Enter the email of the person who has access to the baby"

2. **Message** (optional)
   - Textarea with 500 character limit
   - Character counter
   - Placeholder: "Hi, I'd like to access the baby's information..."

**Flow:**
1. User enters email (+ optional message)
2. Calls `createAccessRequest({ targetEmail, message, requestedAccessLevel: 'editor' })` server action
3. On success:
   - Shows success message
   - Resets form fields
   - Calls `onSuccess()` callback if provided
   - Waits 2 seconds, then redirects to `redirectPath`

**Why 2-second delay:** Gives user time to read success message.

**Success state:**
```typescript
{requestSuccess && (
  <div className="space-y-4">
    <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
      Access request sent successfully! You'll be notified when it's approved.
    </div>
    <button onClick={() => setRequestSuccess(false)}>
      Send Another Request
    </button>
  </div>
)}
```

**Example usage (Bootstrap):**
```typescript
<RequestAccessSection
  redirectPath="/account/bootstrap"
  onSuccess={() => console.log('Request sent')}
/>
```

**Error handling:**
```typescript
if (!result.success) {
  setRequestError(result.error);
  return; // Stay on form
}
```

**Common errors:**
- "Target user not found" (email doesn't exist in system)
- "Target user has no babies" (email exists but no baby access)
- "Request already exists" (duplicate request)

## Bootstrap Integration

**File:** `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx`

**Pattern:**
```typescript
export function BootstrapNoBaby({ locale }: BootstrapNoBabyProps) {
  return (
    <div className="space-y-6">
      {/* Create new baby option */}
      <div className="rounded-lg border p-4">
        <Link href="/settings/babies/new">Create a Baby Profile</Link>
      </div>

      {/* Join with code */}
      <JoinWithCodeSection redirectPath="/account/bootstrap" />

      {/* Request access */}
      <RequestAccessSection redirectPath="/account/bootstrap" />
    </div>
  );
}
```

**Why all redirect to bootstrap:**
- After joining/requesting, need to re-run bootstrap logic
- Bootstrap handles:
  - Syncing new baby data
  - Setting default baby
  - Redirecting to appropriate page

**Critical:** Never redirect directly to app pages after joining - always go through bootstrap.

## Settings Integration (Future)

**Potential use case:** Settings page for adding access to another baby

**Example:**
```typescript
// src/app/[locale]/(auth)/(app)/settings/babies/join/page.tsx
export function JoinBabyPage() {
  return (
    <div className="space-y-6">
      <h1>Join Another Baby</h1>
      <JoinWithCodeSection redirectPath="/settings/babies" />
      <RequestAccessSection redirectPath="/settings/babies" />
    </div>
  );
}
```

**Why redirect to settings:** After joining, user already has default baby - just adding another.

## State Management

Both components use local state (not Zustand):
- `useState` for form values
- `useState` for loading/error states
- `useState` for success/collapse states

**Why local state:**
- Components are self-contained
- No need to share state between instances
- Simpler to reuse in different contexts

**Store updates:**
- `JoinWithCodeSection` updates `useBabyStore.setActiveBaby()` after success
- `RequestAccessSection` doesn't update stores (request pending, no baby access yet)

## Accessibility

**Collapsible sections:**
- Button type="button" (not form submit)
- Accessible expand/collapse icons (ChevronUp/ChevronDown)
- Text labels (not icon-only)

**Forms:**
- Proper label-input associations (id + htmlFor)
- Required field indicators
- Help text for clarity
- Disabled states during submission

**Error handling:**
- Inline error display (above form)
- High contrast error colors
- Clear error messages

## Styling Pattern

**Consistent with app theme:**
- Border radius: `rounded-lg` / `rounded-md`
- Spacing: `space-y-4` (form fields), `p-4` (padding)
- Colors: CSS variables (`bg-primary`, `text-destructive`, etc.)
- Hover states: `hover:bg-muted/50`
- Focus states: `focus-visible:ring-2 focus-visible:ring-ring`

**Responsive:**
- Full width on mobile (`w-full`)
- Centered OTP input (`justify-center`)
- Touch-friendly button sizes (`py-2.5`)

## Gotchas

1. **Always redirect to bootstrap after join:** Never redirect to app pages directly (missing data sync).

2. **Use router.replace, not push:** Prevents back button returning to join form.

3. **OTP maxLength must match server:** Client validates 6 digits, server also validates (keep in sync).

4. **Request success delay:** 2-second delay before redirect - don't make it too short (users can't read message).

5. **No toast notifications:** Both components use inline errors (better for form context).

6. **Collapse state not persisted:** If user leaves and returns, sections start closed (intentional - cleaner default).

## Related Files

**Components:**
- `src/components/baby-access/JoinWithCodeSection.tsx` - Passkey acceptance
- `src/components/baby-access/RequestAccessSection.tsx` - Access request form

**Usage:**
- `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx` - Bootstrap integration

**Actions:**
- `src/actions/babyActions.ts` - `acceptInviteByCode`
- `src/actions/accessRequestActions.ts` - `createAccessRequest`

**UI Components:**
- `src/components/ui/input-otp.tsx` - OTP input (from shadcn/ui)
