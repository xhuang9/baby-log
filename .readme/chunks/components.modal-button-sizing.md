---
last_verified_at: 2026-02-04T00:00:00Z
source_paths:
  - src/components/activity-modals/BaseActivityModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components/ReactionButtons.tsx
---

# Modal Button Sizing Consistency

## Purpose

Standardized button sizing across all activity modals ensures visual consistency and improves UX by making action buttons predictable and easy to interact with. This pattern applies to primary action buttons (Submit/Update/Save), destructive actions (Delete), and secondary actions (Cancel, Close).

## Standard Button Sizes

### Primary / Destructive Action Buttons

**Used for:** Update, Delete, Save, Submit, or any primary modal action

**Tailwind Classes:**
```
h-11 rounded-full px-6 py-2 text-base font-semibold
```

**Breakdown:**
| Property | Value | Purpose |
|----------|-------|---------|
| `h-11` | 44px height | Thumb-friendly size on mobile (Apple HIG: min 44px) |
| `rounded-full` | 50% border-radius | Pill-shaped, modern aesthetic |
| `px-6` | 24px horizontal padding | Comfortable spacing around text |
| `py-2` | 8px vertical padding | Precise vertical centering |
| `text-base` | 16px font size | Readable without magnification |
| `font-semibold` | 600 weight | Emphasizes importance of action |

### Dimensions

- **Button height:** 44px (h-11)
- **Minimum touch target:** 44x44px (meets accessibility standards)
- **Actual dimensions:** 44px tall × variable width based on text + padding

### Implementation in BaseActivityModal

**File:** `src/components/activity-modals/BaseActivityModal.tsx`

```tsx
// Update Button
<button
  onClick={onSubmit}
  className="h-11 rounded-full px-6 py-2 text-base font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
>
  Update
</button>

// Delete Button (destructive, secondary position)
<button
  onClick={onDelete}
  className="h-11 rounded-full px-6 py-2 text-base font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors"
>
  Delete
</button>

// Cancel Button (secondary, outline style)
<button
  onClick={onClose}
  className="h-11 rounded-full px-6 py-2 text-base font-semibold bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-100"
>
  Cancel
</button>
```

## Layout Pattern

### Modal Footer Button Group

Typical modal footer layout places buttons in a consistent order and spacing:

```tsx
<div className="flex gap-3 justify-between mt-6">
  {/* Secondary actions (left) */}
  <button className="h-11 rounded-full px-6 py-2 text-base font-semibold">Cancel</button>

  {/* Primary action (right) */}
  <button className="h-11 rounded-full px-6 py-2 text-base font-semibold bg-primary">Update</button>
</div>
```

**Spacing:**
- Gap between buttons: `gap-3` (12px)
- Vertical margin above buttons: `mt-6` (24px)

## Color Variants

### Button Color States

All buttons using this size follow consistent color patterns:

| Button Type | Background | Hover | Text Color |
|-------------|-----------|-------|-----------|
| **Primary** (Update/Submit) | `bg-primary` | `hover:bg-primary/90` | `text-white` |
| **Destructive** (Delete) | `bg-destructive` | `hover:bg-destructive/90` | `text-white` |
| **Secondary** (Cancel) | `bg-gray-200` (light) / `bg-gray-700` (dark) | `hover:bg-gray-300` / `hover:bg-gray-600` | `text-gray-900` / `text-gray-100` |

### Hover & Transition

- **Transition:** `transition-colors` — smooth color fade on hover
- **Hover effect:** 10% opacity reduction (`/90`) for depth
- **Duration:** 150ms (Tailwind default)

## Use Cases

### When to Apply This Pattern

1. **Primary modal actions:** Any "Save", "Update", "Submit", "Create" button in a modal
2. **Destructive actions:** "Delete" buttons that require confirmation
3. **Secondary actions:** "Cancel", "Close", "Discard" buttons that dismiss the modal
4. **Consistency:** When adding buttons to ANY activity modal, use these exact sizes

### When NOT to Apply

- **Small inline buttons:** Use smaller sizes (h-9, h-10) for buttons inside form sections or inline with text
- **Icon-only buttons:** Use appropriate square dimensions (h-10 w-10)
- **Links styled as buttons:** May use different sizing depending on context

## Evolution & Rationale

### Why 44px (h-11)?

1. **Mobile accessibility:** Apple HIG recommends minimum 44x44px touch targets
2. **Thumb-friendly:** Larger target reduces mis-taps on mobile devices
3. **Readability:** 16px text at 44px height is comfortable without zoom
4. **Modern standard:** Aligns with contemporary mobile/web design practices

### Why Pill-Shaped (`rounded-full`)?

1. **Modern aesthetic:** Soft, friendly appearance aligns with brand for stressed parents
2. **Visual distinction:** Clear CTA buttons that stand out from form inputs
3. **Psychological:** Rounded shapes reduce perception of threat (important for "Delete" buttons)

## Related Patterns

### Activity Tile Buttons

Activity tiles on the overview page use similar button sizing within the tile:

```tsx
// Activity tile action pill (smaller, 28px)
.activity-tile-action {
  @apply flex h-7 items-center gap-1.5 rounded-lg px-2; // h-7 = 28px
}
```

**Difference:** Activity tile actions are **smaller** (h-7 vs h-11) because they're less critical and sit within another button.

### Form Input Sizes

Modal forms may contain text inputs that don't use this button sizing:

```tsx
// Typical input height
<input className="h-10 rounded-lg px-3 py-2" />
```

This is intentional—inputs are h-10 (40px), buttons are h-11 (44px). Buttons are slightly larger to indicate primary actions.

## Accessibility Considerations

1. **Touch Target Size:** 44x44px meets WCAG AAA standards for touch interfaces
2. **Font Size:** 16px (`text-base`) is readable without zoom on mobile
3. **Color Contrast:** Primary and destructive buttons use high-contrast semantic colors
4. **Focus States:** Buttons include focus rings (Tailwind default `focus:ring-2`)
5. **Disabled States:** Add `disabled:opacity-50 disabled:cursor-not-allowed` if button can be disabled

## Gotchas

1. **Padding Math:** `px-6 py-2` applies to the text, not the full button
   - Actual button width = text width + 48px (24px left + 24px right)
   - Keep text reasonably short ("Update", "Delete", "Cancel") — not "Save Changes To Profile"

2. **Long Text Overflow:** If button text is too long, it wraps to two lines or gets cut off
   ```tsx
   // Bad: Text too long
   <button className="h-11 ...">Save Current Activity Log Entry</button>

   // Good: Concise labels
   <button className="h-11 ...">Update</button>
   ```

3. **Dark Mode Testing:** Always test buttons in both light and dark mode. Secondary button colors require explicit dark mode rules:
   ```tsx
   className="bg-gray-200 dark:bg-gray-700 ..."
   ```

4. **Consistency Within Modal:** If adding a new button to a modal, use this exact sizing. Mixing h-10 and h-11 buttons looks unprofessional.

## Testing Checklist

- [ ] Button height is 44px (matches other modal buttons)
- [ ] Button has pill shape (rounded-full)
- [ ] Text is readable (text-base, semibold weight)
- [ ] Padding is consistent (px-6 py-2)
- [ ] Hover state shows visual feedback (opacity transition)
- [ ] Dark mode colors are applied and readable
- [ ] All modal buttons (Update/Delete/Cancel) match this sizing
- [ ] Focus ring visible on keyboard navigation
- [ ] Touch target is at least 44x44px

## Future Enhancements

1. **Button Component Library:** Extract sizing as a reusable button component/utility
   ```tsx
   <Button size="lg" variant="primary">Update</Button>
   ```

2. **Loading States:** Add spinner animation for async actions
   ```tsx
   <button disabled={isLoading} className="...">
     {isLoading ? <Spinner /> : 'Update'}
   </button>
   ```

3. **Icon Support:** Add icon positioning (left/right) for buttons with icons
   ```tsx
   <Button icon={<DeleteIcon />}>Delete Activity</Button>
   ```

## Related

- `.readme/sections/styling.index.md` — Button styling guidelines
- `.readme/sections/architecture.index.md` — Component structure patterns
- `src/components/activity-modals/BaseActivityModal.tsx` — Modal component using this pattern
