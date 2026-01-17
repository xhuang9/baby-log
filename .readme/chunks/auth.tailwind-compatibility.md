---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/layout.tsx
  - src/styles/global.css
  - postcss.config.mjs
  - src/lib/clerk-theme.ts
  - src/styles/clerk-overrides.css
---

# Clerk + Tailwind CSS v4 Compatibility

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Keep Clerk UI styles compatible with Tailwind CSS v4 by controlling cascade layers and using a shared Clerk appearance theme.

## Key Deviations from Standard

- **Layer ordering over cssLayerName**: Instead of setting `cssLayerName`, the app defines `@layer theme, base, clerk, components, utilities` in `global.css`.
- **Shared appearance theme**: Clerk appearance is centralized in `src/lib/clerk-theme.ts` and applied in the auth layout.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/layout.tsx` - Applies `clerkAppearance` to ClerkProvider.
- `src/lib/clerk-theme.ts` - Defines the Clerk `Appearance` using shadcn base theme and CSS variables.
- `src/styles/global.css` - Imports Tailwind + Clerk overrides and declares layer ordering.
- `src/styles/clerk-overrides.css` - Custom overrides inside `@layer clerk`.
- `postcss.config.mjs` - Enables Tailwind CSS processing.

### Data Flow
1. `global.css` defines layer order and imports `clerk-overrides.css`.
2. `clerkAppearance` sets CSS variable mappings to the app theme.
3. ClerkProvider uses that appearance across auth routes.

### Code Pattern
```css
@import 'tailwindcss';
@import './clerk-overrides.css';

@layer theme, base, clerk, components, utilities;
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `@layer order` | `theme, base, clerk, components, utilities` | Ensures Clerk styles land in the expected cascade layer.
| `clerkAppearance.baseTheme` | `shadcn` | Base theme for Clerk components.
| `clerkAppearance.variables.colorPrimary` | `var(--primary)` | Aligns Clerk primary color with app theme.
| `clerkAppearance.elements.formButtonPrimary` | `bg-primary ...` | Tailwind classes applied to Clerk form buttons.

## Gotchas / Constraints

- **Override layer**: Custom Clerk overrides must live in `@layer clerk` to keep ordering predictable.
- **Theme variables**: Changing CSS variables in `global.css` impacts Clerk appearance immediately.

## Testing Notes

- Validate sign-in and user profile components render with correct colors in light and dark modes.
- Confirm custom overrides in `clerk-overrides.css` apply (e.g., user profile width).

## Related Systems

- `.readme/chunks/auth.clerk-layout-pattern.md` - ClerkProvider configuration.
- `.readme/chunks/styling.dev-palette-page.md` - Theme variable reference.
