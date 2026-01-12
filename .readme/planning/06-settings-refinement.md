# Settings Page Refinement

**Priority:** Medium
**Dependencies:** None
**Estimated Scope:** Small

---

## Overview

Refine the settings page to align with design standards. Add responsive layout with min-width for desktop, and implement left/right hand mode for mobile users.

---

## Requirements

### Layout Refinement

| Screen Size | Behavior |
|-------------|----------|
| Mobile (< 640px) | Full width, stacked |
| Tablet (640-1024px) | Centered, max-width 600px |
| Desktop (> 1024px) | Centered, max-width 600px |

### New Settings

| Setting | Type | Options |
|---------|------|---------|
| Hand mode | Toggle | Left / Right |
| Theme | Toggle | Light / Dark / System |
| Default log view | Dropdown | Feed / Sleep / All |
| Notifications | Toggle | On / Off |

---

## Hand Mode Feature

### Purpose
Optimize UI for one-handed mobile use. When set to "Left", primary action buttons move to the left side of the screen.

### Affected Components

| Component | Left Mode | Right Mode (default) |
|-----------|-----------|---------------------|
| Add button (FAB) | Bottom-left | Bottom-right |
| Sheet close button | Top-left | Top-right |
| Primary actions | Left-aligned | Right-aligned |
| Timer controls | Left side | Right side |

### Implementation

```typescript
// src/stores/useUIConfigStore.ts
type HandMode = 'left' | 'right';

type UIConfigStore = {
  handMode: HandMode;
  setHandMode: (mode: HandMode) => void;
};

// Usage in components
const { handMode } = useUIConfigStore();
const isLeftHanded = handMode === 'left';

// Conditional classes
className={cn(
  'fixed bottom-4',
  isLeftHanded ? 'left-4' : 'right-4'
)}
```

---

## UI Design

### Settings Page Layout

```
┌─────────────────────────────────────────┐
│  Settings                               │
├─────────────────────────────────────────┤
│                                          │
│  Account                                 │
│  ┌─────────────────────────────────────┐│
│  │ Profile                          →  ││
│  ├─────────────────────────────────────┤│
│  │ Sign out                            ││
│  └─────────────────────────────────────┘│
│                                          │
│  Babies                                  │
│  ┌─────────────────────────────────────┐│
│  │ Manage babies                    →  ││
│  └─────────────────────────────────────┘│
│                                          │
│  Preferences                             │
│  ┌─────────────────────────────────────┐│
│  │ Theme                    [System ▼] ││
│  ├─────────────────────────────────────┤│
│  │ Hand mode                [Right ▼]  ││
│  ├─────────────────────────────────────┤│
│  │ Default view             [Feed ▼]   ││
│  └─────────────────────────────────────┘│
│                                          │
│  About                                   │
│  ┌─────────────────────────────────────┐│
│  │ Version                      1.0.0  ││
│  └─────────────────────────────────────┘│
│                                          │
└─────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Layout Refinement

- [ ] Add container with `max-w-xl mx-auto` to settings page
- [ ] Ensure consistent padding on mobile
- [ ] Add section headers (Account, Babies, Preferences, About)
- [ ] Style setting items consistently

### Phase 2: UI Config Store

- [ ] Create `src/stores/useUIConfigStore.ts`
- [ ] Add `handMode`, `theme`, `defaultView` to store
- [ ] Persist to IndexedDB (sync with server)
- [ ] Hydrate on app load

### Phase 3: Hand Mode Implementation

- [ ] Add hand mode selector to settings
- [ ] Update FAB position based on hand mode
- [ ] Update sheet close button position
- [ ] Update primary action alignment
- [ ] Test on mobile devices

### Phase 4: Theme Improvements

- [ ] Ensure theme selector works correctly
- [ ] Add "System" option that follows OS preference
- [ ] Persist theme choice

### Phase 5: Additional Settings

- [ ] Add default view selector
- [ ] Add version info display
- [ ] Add "Clear local data" option (for debugging)

---

## CSS Utilities for Hand Mode

```css
/* Add to globals.css or Tailwind config */

/* Left-handed mode utilities */
.hand-left .fab { @apply left-4 right-auto; }
.hand-left .sheet-close { @apply left-4 right-auto; }
.hand-left .primary-action { @apply justify-start; }

.hand-right .fab { @apply right-4 left-auto; }
.hand-right .sheet-close { @apply right-4 left-auto; }
.hand-right .primary-action { @apply justify-end; }
```

---

## Success Criteria

- [ ] Settings page has consistent max-width on desktop
- [ ] Sections are clearly grouped
- [ ] Hand mode toggle works
- [ ] FAB moves based on hand mode
- [ ] Settings persist across sessions
- [ ] Settings sync to server
