---
last_verified_at: 2026-02-04T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components/ReactionButtons.tsx
---

# Solids Reaction Buttons

## Purpose

Visual feedback component for tracking baby's reaction to solids. Uses semantic color coding to communicate positive (liked) vs. emotional (loved) reactions. Displayed in the solids logging modal on the overview page.

## Component Path

**File:** `src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components/ReactionButtons.tsx`

## Visual Design & Color Scheme

### Reaction Types & Colors

| Reaction | Color | CSS Classes | Meaning |
|----------|-------|-------------|---------|
| **Liked** | Green | `bg-green-500`, `text-green-500` | Positive, healthy intake, natural growth |
| **Loved** | Pink | `bg-pink-500`, `text-pink-500` | Emotional warmth, affection, nurturing bond |

### Design Rationale

- **Green (Liked):** Conveys healthy development, natural progress, positive nutrition
- **Pink (Loved):** Conveys emotional warmth, parent-baby bonding, caring relationship
- Both colors are part of the project's brand palette (soft pastels for new parents)
- Semantic distinction: "Liked" is nutritional data, "Loved" captures emotional significance

## Implementation Pattern

```tsx
// Typical button styling pattern
<button
  onClick={() => handleReaction('liked')}
  className="h-11 rounded-full px-6 py-2 text-base font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
>
  Liked
</button>

<button
  onClick={() => handleReaction('loved')}
  className="h-11 rounded-full px-6 py-2 text-base font-semibold bg-pink-500 text-white hover:bg-pink-600 transition-colors"
>
  Loved
</button>
```

## Size & Spacing

- **Height:** `h-11` (44px) — matches other modal buttons for consistency
- **Padding:** `px-6 py-2` — horizontal 24px, vertical 8px
- **Border Radius:** `rounded-full` (50% radius) — pill-shaped buttons
- **Font:** `text-base font-semibold` — readable, emphasizes choice

## Dark Mode

Both green and pink are Tailwind colors that automatically adjust for dark mode:
- Light mode: Bright, saturated colors (high contrast against white backgrounds)
- Dark mode: Tailwind automatically darkens/adjusts for contrast against dark backgrounds
- CSS variables follow theme automatically

**Testing:** Verify both colors are readable in light and dark mode. Ensure hover states provide clear feedback.

## Related Modals & Patterns

### Integration with Add Solids Modal

`ReactionButtons` is a sub-component of the solids logging modal hierarchy:

```
add-solids-modal/
├── AddSolidsModal.tsx (orchestrator)
└── components/
    ├── ReactionButtons.tsx (this component)
    └── [...other sections]
```

The buttons appear after user selects a food item and quantity. Selection triggers state update that surfaces the selected reaction in the parent modal state.

### Similar Patterns

- **Feed modal:** May have different button patterns (e.g., breast/bottle selection)
- **Other activity modals:** Typically use different UI patterns appropriate to the activity type
- **Color consistency:** Always use semantic colors from the brand palette, not arbitrary colors

## Accessibility Considerations

1. **Button Type:** Use `<button>` elements, not divs with click handlers
2. **Text Labels:** "Liked" and "Loved" are clear, non-ambiguous text
3. **Color Not Sole Indicator:** Text labels ensure meaning is not conveyed by color alone
4. **Contrast:** Tailwind's green-500 and pink-500 meet AA contrast standards on white backgrounds; verify on dark mode
5. **Focus State:** Ensure visible focus ring (Tailwind's default `focus:ring-2`)

## Gotchas

1. **No Gray/Neutral Option:** This component only has two states (liked/loved). There is no "didn't like" or "meh" option. This is intentional—focus is on positive/emotional responses, not negative feedback.

2. **Color Specificity:** Use exact Tailwind color values (`bg-green-500`, `bg-pink-500`), not variations like `-400`, `-600`. This ensures consistency with brand palette.

3. **Hover States:** Include hover state transitions for visual feedback. Without them, buttons feel unresponsive.
   ```tsx
   className="... hover:bg-green-600 transition-colors"
   ```

4. **Button Width:** Buttons should be sized to content (not full-width) unless specified by parent modal layout. Check parent container's layout constraints.

## Testing Checklist

- [ ] Both "Liked" and "Loved" buttons visible and clickable
- [ ] Colors are accurate (green vs. pink, not other shades)
- [ ] Buttons work in light mode (colors visible on white background)
- [ ] Buttons work in dark mode (colors adjusted for contrast)
- [ ] Hover state shows feedback (color darkening or opacity change)
- [ ] Click handler properly updates parent modal state
- [ ] Keyboard navigation works (Tab to focus, Enter to activate)

## Future Enhancements

1. **Reaction Icons:** Add emoji or icon to each button (e.g., ✓ for "Liked", ❤️ for "Loved")
2. **Reaction History:** Track reaction trends over time to help parents identify food preferences
3. **Allergy Flags:** Link "Didn't like" reactions to allergy screening workflow
4. **Parent Notes:** Allow free-text notes alongside reactions

## Related

- `.readme/sections/feed-logging.index.md` — Activity logging patterns
- `.readme/sections/styling.index.md` — Color system and brand palette
- `.readme/planning/brand-guideline.md` — Brand color rationale
- `src/styles/activity-colors.css` — Color token definitions
