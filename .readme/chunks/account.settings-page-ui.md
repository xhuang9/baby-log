---
last_verified_at: 2026-01-15T08:30:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/SettingsContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/HandPreferenceSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/ThemeSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/BabiesList.tsx
---

# Settings Page UI Pattern

## Purpose
Unified settings page with responsive layout, sectioned design, and local-first UI config integration. Optimized for desktop (max-width 600px) and mobile (full-width stacked).

## Page Structure

### Route
- Path: `/[locale]/settings`
- File: `src/app/[locale]/(auth)/(app)/settings/page.tsx`

### Layout Breakpoints

| Screen Size | Behavior |
|-------------|----------|
| Mobile (< 640px) | Full width, stacked sections |
| Tablet (640-1024px) | Centered, max-width 600px |
| Desktop (> 1024px) | Centered, max-width 600px |

### CSS Classes
```tsx
<div className="mx-auto max-w-xl min-w-80 space-y-6 px-4 pb-8">
```

**Key classes:**
- `max-w-xl`: Limits width to ~36rem (576px) on large screens
- `min-w-80`: Minimum width 20rem (320px) to prevent collapse
- `mx-auto`: Centers horizontally
- `space-y-6`: Vertical spacing between sections

## Section Design Pattern

Each section follows this structure:

```tsx
<section className="space-y-3">
  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
    SECTION TITLE
  </h2>
  <div className="rounded-lg border bg-background [content]">
    {/* Section content here */}
  </div>
</section>
```

### Section Title Styling
- **Small caps effect**: `uppercase tracking-wide`
- **Muted color**: `text-muted-foreground`
- **Size**: `text-sm font-semibold`
- Creates clear visual hierarchy without being loud

## Sections

### 1. Account Section

**Components:**
- Clerk UserAvatar + user name + email
- Link to `/settings/user-profile` (Clerk's built-in profile management)
- SignOutButton

**Layout:**
```tsx
<div className="rounded-lg border bg-background overflow-hidden">
  <Link /* Profile link with hover state */>
    <UserAvatar />
    <div>Name + Email</div>
    <ChevronRight icon />
  </Link>
  <div className="border-t px-4 py-3">
    <SignOutButton />
  </div>
</div>
```

**Pattern:** Profile link has hover effect (`hover:bg-muted/50`), sign-out is below a border divider.

### 2. Children Section

**Component:** `<BabiesList babies={babies} locale={locale} />`

**Purpose:** Lists all babies user has access to, with navigation to baby management pages.

### 3. Preferences Section

**Components:**
- `<ThemeSetting />`: Theme selector (Light / Dark / System)
- `<HandPreferenceSetting isCompact />`: Hand mode selector (Left / Right)

**Layout:**
```tsx
<div className="rounded-lg border bg-background divide-y">
  <div className="p-4">
    <ThemeSetting />
  </div>
  <div className="p-4">
    <HandPreferenceSetting isCompact />
  </div>
</div>
```

**Pattern:** Each preference is in a `p-4` padded div, separated by `divide-y` borders.

#### isCompact Prop

Settings components support two layouts:

**Non-compact** (default):
```tsx
<div className="rounded-lg border bg-background p-4">
  {/* Setting content */}
</div>
```
Used when component is standalone.

**Compact** (`isCompact={true}`):
```tsx
<div className="flex items-center justify-between">
  {/* Setting content, no border/background */}
</div>
```
Used when component is inside a shared container (like Preferences section).

### 4. About Section

**Content:**
- App version number
- Future: Links to privacy policy, terms, support

**Layout:**
```tsx
<div className="rounded-lg border bg-background p-4">
  <div className="flex items-center justify-between">
    <p className="text-sm font-medium">Version</p>
    <p className="text-sm text-muted-foreground">1.0.0</p>
  </div>
</div>
```

## Setting Component Pattern

### Hand Preference Setting

**File:** `src/app/[locale]/(auth)/(app)/settings/HandPreferenceSetting.tsx`

#### Local-First Loading Pattern

```tsx
const [handMode, setHandMode] = useState<HandMode>('right');
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function loadHandMode() {
    if (!user?.localId) {
      // Wait for user, show loading state
      return;
    }
    const config = await getUIConfig(user.localId);
    setHandMode(config.data.handMode ?? 'right');
    setIsLoading(false);
  }
  loadHandMode();
}, [user?.localId]);
```

**Loading state:** Shows skeleton with pulsing animation while waiting for IndexedDB.

#### Immediate Update Pattern

```tsx
const handleChange = (value: HandMode) => {
  // 1. Update local state immediately (optimistic UI)
  setHandMode(value);

  // 2. Write to IndexedDB (local-first)
  updateUIConfig(userId, { handMode: value }).catch(console.error);

  // 3. TODO: Enqueue outbox mutation for server sync
};
```

**Pattern:** Local state updates instantly, IndexedDB writes async, server sync is future work.

#### Component Structure

```tsx
<div className={cn(
  'flex items-center justify-between',
  !isCompact && 'rounded-lg border bg-background p-4',
)}>
  <div className="pr-4">
    <p className="text-sm font-medium">Hand Preference</p>
    <p className="text-xs text-muted-foreground">
      Choose your dominant hand for better button placement
    </p>
  </div>
  <Select value={handMode} onValueChange={handleChange}>
    {/* ... */}
  </Select>
</div>
```

**Layout:**
- Left side: Label + description
- Right side: Control (select/toggle/dropdown)
- `justify-between` for horizontal spacing
- Description uses `text-xs text-muted-foreground` for secondary text

## shadcn/ui Components Used

### Select (Dropdown)

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select value={handMode} onValueChange={handleChange}>
  <SelectTrigger className="w-24">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="left">Left</SelectItem>
    <SelectItem value="right">Right</SelectItem>
  </SelectContent>
</Select>
```

**File:** `src/components/ui/select.tsx` (Radix UI based)

### Future Components (Planned)

- **Switch**: For boolean toggles (notifications on/off)
- **RadioGroup**: For mutually exclusive options (theme selector)
- **Popover**: For inline help text or additional options

## Responsive Behavior

### Mobile Optimizations
- Full-width sections (`px-4` for edge breathing room)
- Stacked layout (no side-by-side)
- Touch-friendly targets (44x44px minimum)
- Select dropdowns expand to full width

### Desktop Optimizations
- Centered layout with max-width prevents text from stretching
- Compact padding maintains visual hierarchy
- Hover states on interactive elements

## Future Enhancements (from planning doc)

### Additional Settings
- Default log view (All / Feed / Sleep)
- Notifications toggle
- Dashboard visibility (show/hide activity types)
- Language selector (uses next-intl)

### Sync Conflict Prompt
When user logs in with different settings on server vs local:

```tsx
<Dialog>
  <DialogTitle>Settings Conflict Detected</DialogTitle>
  <DialogDescription>
    Your local settings differ from your synced settings.
  </DialogDescription>
  <DialogFooter>
    <Button onClick={keepLocal}>Keep Local</Button>
    <Button onClick={useServer}>Use Server</Button>
    <Button onClick={autoMerge} variant="default">Auto Merge</Button>
  </DialogFooter>
</Dialog>
```

**Logic:** Compare local `keyUpdatedAt` vs remote `keyUpdatedAt` per key, show diff list.

## Gotchas

1. **Use `user?.localId` not `user?.id`**: Settings are stored by Dexie user ID (numeric), not Clerk ID (string).

2. **Handle loading state**: IndexedDB reads are async. Show skeleton/spinner while loading to avoid flash of default values.

3. **Clean up on unmount**: Use `let mounted = true` pattern in useEffect to prevent state updates after component unmounts.

4. **isCompact prop**: When adding new settings, support both compact and standalone layouts for flexibility.

5. **Clerk UserAvatar requires client component**: Settings page is server component, but UserAvatar usage is in client component (SettingsContent).

## Related

- `.readme/chunks/local-first.ui-config-storage.md` - UI config data model and helpers
- `.readme/planning/05-ui-config-sync.md` - Full implementation plan for settings sync
- `.readme/chunks/account.bootstrap-unified-flow.md` - Bootstrap API includes UI config
