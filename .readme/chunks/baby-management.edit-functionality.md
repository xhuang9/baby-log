---
last_verified_at: 2026-01-08T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx
  - src/actions/babyActions.ts
---

# Baby Edit Functionality

## Purpose
Allows owners and editors to update baby profile information and caregiver labels through a form interface with collapsible sections.

## Key Deviations from Standard

### Dual-Level Updates
The `updateBaby()` server action updates **two tables** in one operation:

1. **Baby profile fields** (`babies` table):
   - `name`
   - `birthDate`
   - `gender`
   - `birthWeightG`

2. **User-specific preferences** (`baby_access` table):
   - `caregiverLabel` (scoped to current user's access row)

**Why this pattern:**
- `caregiverLabel` is **per-user**, not per-baby
- Multiple users with access to same baby can have different labels
- Example: One user's label = "Mom", another's = "Dad"

### Collapsible Optional Sections
Form uses **progressive disclosure** pattern:
- Required field always visible: Baby name
- Optional sections collapsed by default:
  - "Baby Details" (birthDate, gender, birthWeightG)
  - "Your Preferences" (caregiverLabel)

**Why:** Reduces cognitive load, focuses on most common edit (name).

### Partial Updates
The server action accepts **partial data object**:
```typescript
updateBaby(babyId, {
  name?: string;
  birthDate?: Date | null;
  gender?: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
})
```

**Pattern:** Only provided fields are updated (not all-or-nothing).

## Implementation

### Access Control

#### Route-Level Check
Server component (`page.tsx`) verifies access before rendering:
```typescript
if (babyData.accessLevel === 'viewer') {
  redirect('/settings');
}
```

**Result:** Viewers cannot reach edit form at all.

#### Server Action Check
`updateBaby()` double-validates access:
```typescript
const [access] = await db
  .select({ accessLevel: babyAccessSchema.accessLevel })
  .from(babyAccessSchema)
  .where(
    and(
      eq(babyAccessSchema.userId, localUser.id),
      eq(babyAccessSchema.babyId, babyId),
      sql`${babiesSchema.archivedAt} IS NULL`,
    ),
  );

if (!access) {
  return { success: false, error: 'You do not have access to this baby' };
}

if (access.accessLevel === 'viewer') {
  return { success: false, error: 'You do not have permission to edit this baby' };
}
```

**Why double-check:** Defense in depth, prevents direct server action calls.

### Form State Management

#### Local State (No Form Library)
Uses React `useState` for all fields:
- No React Hook Form
- No Zod validation client-side
- Simple controlled inputs

**Why:** Form is small (5 fields), no complex validation needed.

#### Date Handling
**Format conversion for date input:**
```typescript
const formatDateForInput = (date: Date | null) => {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Usage:
const [birthDate, setBirthDate] = useState(
  formatDateForInput(initialData.birthDate)
);

// On submit:
birthDate: birthDate ? new Date(birthDate) : null
```

**Key pattern:** Input field expects string (`YYYY-MM-DD`), server action expects `Date` object.

### Server Action Pattern

#### Conditional Field Updates
Only updates fields that are provided in data object:
```typescript
const updateData: Record<string, unknown> = {};
if (data.name !== undefined) updateData.name = data.name;
if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;
if (data.gender !== undefined) updateData.gender = data.gender;
if (data.birthWeightG !== undefined) updateData.birthWeightG = data.birthWeightG;

if (Object.keys(updateData).length > 0) {
  await db
    .update(babiesSchema)
    .set(updateData)
    .where(eq(babiesSchema.id, babyId));
}
```

**Why:** Allows partial updates, doesn't overwrite unchanged fields.

#### Separate Caregiver Label Update
```typescript
if (data.caregiverLabel !== undefined) {
  await db
    .update(babyAccessSchema)
    .set({ caregiverLabel: data.caregiverLabel })
    .where(
      and(
        eq(babyAccessSchema.babyId, babyId),
        eq(babyAccessSchema.userId, localUser.id), // Only update current user's label
      ),
    );
}
```

**Critical:** Updates only **current user's** `baby_access` row, not all users with access.

#### Revalidation Paths
After successful update:
```typescript
revalidatePath('/settings');
revalidatePath('/overview');
```

**Why:** Ensures settings page and overview pages show updated data immediately.

## Form Structure

### Required Fields
- **Baby name** (`name`): Always visible, required, default placeholder: "Enter baby's name"

### Optional Fields (Collapsible Sections)

#### Baby Details Section
- **Birth Date** (`birthDate`): Date input, max = today
- **Gender** (`gender`): Select dropdown with options:
  - "Prefer not to say" (value: `unknown`, default)
  - "Male"
  - "Female"
  - "Other"
- **Birth Weight** (`birthWeightG`): Number input (integer), unit: grams, placeholder: "e.g., 3500"

#### Your Preferences Section
- **Your Name in System** (`caregiverLabel`): Text input, default: "Parent", placeholder: "e.g., Mom, Dad, Parent"
- Help text: "This label will be used when sharing the baby with others"

### Submit Button
- Text: "Save Changes" (idle) / "Saving..." (submitting)
- Full width
- Disabled during submission

## Patterns

### No Client-Side Validation
Form relies on **HTML5 validation** and **server-side checks**:
- `required` attribute on name field
- `type="date"` with `max` attribute
- `type="number"` with `min` and `step`

**Why:** Keeps client bundle small, server validation is authoritative.

### Collapsible Section State
Tracks section visibility with local state:
```typescript
const [showDetails, setShowDetails] = useState(false);
const [showPreferences, setShowPreferences] = useState(false);
```

**Icons:**
- Collapsed: `ChevronDown`
- Expanded: `ChevronUp`

**Why separate state:** User can expand one, both, or neither section.

### Error Display
Single error state at top of form:
```typescript
{error && (
  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
    {error}
  </div>
)}
```

**No field-level errors:** Simple approach, one error message at a time.

### Redirect After Save
On success:
```typescript
router.push(redirectPath); // Usually /settings
router.refresh();
```

**Why `redirectPath` prop:** Allows reuse of form component from different entry points.

## Gotchas

### Gender Field Default Value
When `initialData.gender` is `null`, form defaults to `'unknown'`:
```typescript
const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unknown'>(
  initialData.gender ?? 'unknown',
);
```

**On submit:**
```typescript
gender: gender === 'unknown' ? null : gender
```

**Why:** Database stores `null`, but select needs string value. Convert back to `null` for database.

### Birth Weight: String to Number
Input field stores string, server action expects number:
```typescript
const [birthWeightG, setBirthWeightG] = useState(
  initialData.birthWeightG?.toString() ?? ''
);

// On submit:
birthWeightG: birthWeightG ? parseInt(birthWeightG, 10) : null
```

**Pattern:** Empty string → `null` in database.

### Caregiver Label Empty String Fallback
```typescript
caregiverLabel: caregiverLabel.trim() || 'Parent'
```

**Why:** Prevent empty string in database, always have a label.

### No Optimistic Updates
Form waits for server response before redirecting:
- No immediate UI update
- Loading state during save
- Redirect only after success

**Why:** Editing is less frequent than viewing, correctness > speed.

## Related
- `.readme/chunks/baby-management.flattened-ui-pattern.md` - Baby management UI patterns
- `.readme/chunks/account.baby-multi-tenancy.md` - Access control patterns
- `.readme/chunks/database.schema-workflow.md` - Schema migration workflow
