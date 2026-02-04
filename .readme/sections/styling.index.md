# Styling & Brand Guidelines

> **Read this section when:** applying colors, styling components, creating new UI elements, or making any visual design decisions.

## Brand Philosophy

This app targets **new parents (especially millennial moms)** with calming, trust-inspiring aesthetics. Design decisions are evidence-backed for stressed, sleep-deprived users:

- **Soft pastel tones** over bold/harsh colors
- **Soothing, gentle hues** that reduce anxiety
- **Dark mode support** is mandatory for late-night/2 AM use

## Theme Support: Dark & Light Mode

**CRITICAL:** This project supports both dark and light modes. Every styling decision must account for both themes.

- Theme toggle via `.dark` class on root element
- Use CSS custom properties (CSS variables) for all colors
- Never hardcode colors - always use semantic tokens
- Test all UI changes in both light and dark mode

## Color System (OKLCH)

### Primary Colors

| Token | Light Mode | Dark Mode | Use For |
|-------|------------|-----------|---------|
| `--primary` | Mint green (hue 175) | Slightly brighter mint | CTAs, primary actions, brand identity |
| `--secondary` | Soft pink/blush (hue 20) | Darker muted pink | Secondary actions, warmth accents |
| `--accent` | Soft blue (hue 210) | Muted blue | Trust signals, highlights |

### Brand Color Rationale

- **Mint Green (primary):** Reduces stress, conveys harmony, balance, health, naturalness
- **Soft Pink (secondary):** Warmth, caring, compassion, nurturing, femininity
- **Soft Blue (accent):** Trust, tranquility, reliability, safety

### Semantic Tokens

```css
/* Use these semantic tokens, NOT raw colors */
--background / --foreground        /* Page backgrounds, text */
--card / --card-foreground         /* Card surfaces */
--muted / --muted-foreground       /* Subdued elements */
--destructive                      /* Errors, deletions */
--border / --input / --ring        /* UI chrome */
```

## File Structure

```
src/styles/
├── global.css              # Main entry, theme variables, base styles
├── activity-colors.css     # Activity-specific color tokens
├── activity-typography.css # Activity tile typography
└── clerk-overrides.css     # Clerk auth component overrides
```

## Activity Color System

Each activity type has dedicated colors for visual distinction. Uses Tailwind color palette with automatic dark mode inversion:

| Activity | Light BG | Dark BG | Meaning |
|----------|----------|---------|---------|
| Feed | teal-100/950 | teal-900/50 | Nourishment, calming |
| Sleep | indigo-100/950 | indigo-900/50 | Night, quiet |
| Nappy | amber-100/950 | amber-900/50 | Warm, utility |
| Solids | emerald-100/950 | emerald-900/50 | Growth, vegetables |
| Bath | sky-100/950 | sky-900/50 | Water, clean |
| Tummy time | lime-100/950 | lime-900/50 | Strength, growth |
| Story time | violet-100/950 | violet-900/50 | Imagination |
| Screen time | slate-100/950 | slate-900/50 | Tech, neutral |
| Skin-to-skin | rose-100/950 | rose-900/50 | Warmth, care |
| Outdoor play | green-100/950 | green-900/50 | Nature |
| Indoor play | orange-100/950 | orange-900/50 | Cozy, energy |
| Brush teeth | cyan-100/950 | cyan-900/50 | Fresh, minty |

### Using Activity Colors

```tsx
// Use CSS class for activity tiles
<div className="activity-tile activity-tile--feed">...</div>

// Or use CSS variables directly
style={{ backgroundColor: 'var(--color-activity-feed-background)' }}
```

## Styling Rules

### DO

- Use semantic color tokens (`--primary`, `--foreground`, etc.)
- Use Tailwind utility classes that reference theme variables
- Test in both light AND dark mode
- Keep UI clean, uncluttered, with large legible fonts
- Use warm neutrals (whites, creams, light grays) as base

### DON'T

- Hardcode hex/rgb colors
- Use bright/neon colors in core UI
- Create overstimulating, busy interfaces
- Forget dark mode support
- Use colors that don't meet AA contrast standards

## CSS Layer Order

```css
@layer theme, base, clerk, components, utilities;
```

Custom styles should be added to `components` layer to maintain proper cascade.

## Adding New Colors

1. Define CSS variable in both `:root` and `.dark` in `global.css`
2. Add to `@theme inline` block to expose to Tailwind
3. Use semantic naming: `--color-{purpose}` not `--color-blue-500`

## Chunks

This section's detailed chunks are organized by topic. Use the "Read when" column to find relevant documentation quickly.

| Chunk | Topic | Read when |
|-------|-------|-----------|
| `chunks/styling.dev-palette-page.md` | Dev page for previewing activity color palette | Testing colors, validating brand palette, checking contrast |
| `chunks/styling.activity-tile-card.md` | Shared card styling pattern (shadow + border-radius) | Styling activity tiles, creating new card components, ensuring consistency |
| `chunks/solids.reaction-buttons.md` | Reaction button colors (Liked/Loved) | Working on solids logging, changing reaction colors |
| `chunks/components.modal-button-sizing.md` | Standard modal button sizing (44px height) | Adding buttons to modals, ensuring button consistency |
| `chunks/log.swipe-delete-background.md` | Delete background containment fix (right-1 inset) | Building swipe-to-delete, fixing corner clipping issues |

## Reference Document

Full brand research and rationale: `.readme/planning/brand-guideline.md`
