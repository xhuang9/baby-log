---
last_verified_at: 2026-01-15T08:30:00Z
source_paths:
  - src/app/[locale]/dev/page.tsx
  - src/styles/activity-colors.css
  - src/styles/activity-typography.css
---

# Dev Palette Page

## Purpose
Development-only page for previewing activity color palette and typography without needing to navigate through the app. Hidden in production builds.

## Route & Access

### Path
- URL: `/dev` (no locale prefix needed, routes to `/[locale]/dev`)
- File: `src/app/[locale]/dev/page.tsx`

### Production Safety
```tsx
if (process.env.NODE_ENV !== 'development') {
  notFound();
}
```
**Behavior:** Returns 404 in production, page only accessible during local development.

## Page Sections

### 1. Activity Tiles Section

**Purpose:** Visual preview of all activity types with their ActivityTile component.

**Data:**
```tsx
const activityTiles: Array<{
  title: string;
  subtitle: string;
  activity: ActivityType;
}> = [
  { title: 'Feed', subtitle: 'Tap to log a feed', activity: 'feed' },
  { title: 'Sleep', subtitle: 'Coming soon', activity: 'sleep' },
  { title: 'Nappy', subtitle: 'Coming soon', activity: 'nappy' },
  { title: 'Solids', subtitle: 'Coming soon', activity: 'solids' },
  { title: 'Bath', subtitle: 'Coming soon', activity: 'bath' },
  { title: 'Tummy time', subtitle: 'Coming soon', activity: 'tummy-time' },
  { title: 'Story time', subtitle: 'Coming soon', activity: 'story-time' },
  { title: 'Screen time', subtitle: 'Coming soon', activity: 'screen-time' },
  { title: 'Skin-to-skin', subtitle: 'Coming soon', activity: 'skin-to-skin' },
  { title: 'Outdoor play', subtitle: 'Coming soon', activity: 'outdoor-play' },
  { title: 'Indoor play', subtitle: 'Coming soon', activity: 'indoor-play' },
  { title: 'Brush teeth', subtitle: 'Coming soon', activity: 'brush-teeth' },
];
```

**Component Used:** `ActivityTile` from overview page (`src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx`)

**Grid Layout:**
```tsx
<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
  {activityTiles.map(tile => (
    <ActivityTile
      key={tile.activity}
      title={tile.title}
      subtitle={tile.subtitle}
      activity={tile.activity}
    />
  ))}
</div>
```

**Responsive Breakpoints:**
- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (xl): 3 columns

### 2. Swatches Section

**Purpose:** Shows raw CSS variable colors for each activity type in both light and dark mode.

**Data Mapping:**
```tsx
const paletteSwatches = activityTiles.map(tile => ({
  key: tile.activity,
  label: tile.title,
  backgroundVar: `--color-activity-${tile.activity}-background`,
  foregroundVar: `--color-activity-${tile.activity}-foreground`,
}));
```

**Component Structure:**
```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
  {paletteSwatches.map(swatch => (
    <div
      key={swatch.key}
      className="rounded-lg border p-4"
      style={{
        backgroundColor: `var(${swatch.backgroundVar})`,
        color: `var(${swatch.foregroundVar})`,
      }}
    >
      <div className="text-sm font-semibold">{swatch.label}</div>
      <div className="text-xs opacity-80">{swatch.backgroundVar}</div>
      <div className="text-xs opacity-80">{swatch.foregroundVar}</div>
    </div>
  ))}
</div>
```

**Styling Pattern:**
- Uses inline `style` prop with CSS variables (demonstrates how colors are consumed)
- Shows variable names inside swatch for reference
- Border provides visual separation

## CSS Variable Reference

### Activity Color Tokens (from activity-colors.css)

Each activity type has two tokens:
- `--color-activity-{type}-background`: Background color for tiles/badges
- `--color-activity-{type}-foreground`: Text color for optimal contrast

**Example:**
```css
/* Light mode */
--color-activity-feed-background: hsl(var(--baby-log-green-soft));
--color-activity-feed-foreground: hsl(var(--baby-log-green-dark));

/* Dark mode */
.dark {
  --color-activity-feed-background: hsl(var(--baby-log-green-muted));
  --color-activity-feed-foreground: hsl(var(--baby-log-green-light));
}
```

### Typography Tokens (from activity-typography.css)

Font size and weight for activity-related text (not shown in dev page yet):
- `--activity-title-size`
- `--activity-subtitle-size`
- `--activity-timestamp-size`

## Use Cases

### When to Use This Page

1. **Color palette development**: Testing new activity type colors in both light and dark mode
2. **Brand guideline validation**: Ensuring colors match brand guidelines (see `.readme/planning/brand-guideline.md`)
3. **Contrast checking**: Visual verification of foreground/background color contrast
4. **Component testing**: Seeing ActivityTile in isolation without app context
5. **Design review**: Sharing palette with designers/stakeholders without deploying

### Testing Workflow

```bash
# 1. Start dev server
pnpm dev

# 2. Open dev palette
open http://localhost:3000/dev

# 3. Toggle dark mode in browser (cmd+shift+D in most browsers)

# 4. Make changes to CSS variables in:
#    - src/styles/activity-colors.css
#    - src/styles/activity-typography.css

# 5. Observe hot-reload in dev palette page
```

## Future Enhancements

### Planned Additions
1. **Typography preview**: Show all activity typography tokens with sample text
2. **Color contrast scores**: Display WCAG AA/AAA contrast ratios
3. **Export palette**: Copy CSS variables to clipboard
4. **Component playground**: Interactive props editor for ActivityTile
5. **Responsive preview**: Show tiles at different breakpoints side-by-side

### Code Snippet Preview

```tsx
// Future: Show code examples for consuming colors
<section className="space-y-2">
  <h2 className="text-lg font-semibold">Usage Examples</h2>
  <pre className="rounded-lg bg-muted p-4">
    {`<div
  className="rounded-lg"
  style={{
    backgroundColor: 'var(--color-activity-feed-background)',
    color: 'var(--color-activity-feed-foreground)',
  }}
>
  Feed logged
</div>`}
  </pre>
</section>
```

## Gotchas

1. **Production safety**: Always check `process.env.NODE_ENV` before rendering dev-only content. Do NOT rely on route protection alone.

2. **ActivityTile import**: Import from app-internal path (`overview/_components/ActivityTile.tsx`). Component is not in shared components folder.

3. **CSS variable format**: Must use `var()` wrapper in inline styles: `var(--color-activity-feed-background)`, not just `--color-activity-feed-background`.

4. **Dark mode testing**: Use browser DevTools or OS-level dark mode toggle. Page respects system preference via Tailwind's `dark:` class.

5. **Activity type sync**: When adding new activity types, update BOTH `activityTiles` array in dev page AND `ActivityType` type definition.

## Related

- `.readme/sections/styling.index.md` - Full styling system documentation
- `.readme/planning/brand-guideline.md` - Brand color palette and design rationale
- `src/styles/activity-colors.css` - Activity color token definitions
- `src/styles/activity-typography.css` - Activity typography token definitions
- `src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx` - Component used in tiles section
