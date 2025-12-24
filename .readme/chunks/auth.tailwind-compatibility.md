# Clerk + Tailwind CSS v4 Compatibility

## Purpose
Ensures Clerk components style correctly alongside Tailwind CSS v4 using CSS cascade layers.

## Key Deviations from Standard
- Uses `appearance.cssLayerName` to isolate Clerk styles
- Required for Tailwind CSS v4 (not v3)
- Prevents CSS specificity conflicts

## Configuration

### Location: `src/app/[locale]/(auth)/layout.tsx`
```typescript
<ClerkProvider
  appearance={{
    cssLayerName: 'clerk', // Critical for Tailwind v4 compatibility
  }}
  // ... other props
>
  {props.children}
</ClerkProvider>
```

## Why This Is Needed

### Problem: CSS Cascade Conflicts
Without `cssLayerName`:
- Clerk injects global styles
- Tailwind CSS v4 uses cascade layers
- Styles conflict, Clerk components break visually
- Buttons, forms may have incorrect styling

### Solution: CSS Layers
With `cssLayerName: 'clerk'`:
- Clerk styles isolated in `@layer clerk { ... }`
- Tailwind utilities have higher specificity
- Can override Clerk styles with Tailwind classes
- Predictable cascade order

## Tailwind CSS v4 Specifics

### Global Styles: `src/styles/global.css`
```css
@import "tailwindcss";

/* Clerk layer automatically injected */
@layer clerk {
  /* Clerk component styles */
}

/* Your custom styles */
@layer components {
  .btn {
    /* ... */
  }
}
```

Tailwind CSS v4 manages layer ordering automatically.

## Customizing Clerk Appearance

### Theme Variables
```typescript
<ClerkProvider
  appearance={{
    cssLayerName: 'clerk',
    variables: {
      colorPrimary: '#3b82f6', // Tailwind blue-500
      borderRadius: '0.5rem',
    },
  }}
>
```

### Custom Classes
```typescript
<ClerkProvider
  appearance={{
    cssLayerName: 'clerk',
    elements: {
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
      card: 'shadow-xl',
    },
  }}
>
```

Tailwind classes work because Clerk layer has lower specificity.

## Important Patterns

### Overriding Clerk Styles
```typescript
<SignIn
  appearance={{
    elements: {
      formButtonPrimary: 'bg-green-600 hover:bg-green-700 text-white',
      card: 'shadow-2xl border-2 border-gray-200',
      headerTitle: 'text-2xl font-bold',
    },
  }}
/>
```

### Dark Mode Support
```typescript
<ClerkProvider
  appearance={{
    cssLayerName: 'clerk',
    baseTheme: dark, // or light
    // Or use variables for granular control
    variables: {
      colorBackground: '#1f2937', // gray-800
      colorText: '#f9fafb', // gray-50
    },
  }}
>
```

## Gotchas / Constraints

- `cssLayerName` required for Tailwind v4 (not v3)
- Must be set in ALL ClerkProvider instances
- Don't use `!important` to override Clerk styles (breaks layers)
- Custom CSS should use cascade layers: `@layer components { ... }`
- Clerk v5+ required for `cssLayerName` support

## Migration from Tailwind v3

If upgrading from Tailwind CSS v3:
1. Add `cssLayerName: 'clerk'` to ClerkProvider
2. Update global.css to use `@import "tailwindcss"`
3. Test all Clerk components for visual regressions
4. Adjust custom styles if needed

## Related Systems
- `.readme/chunks/auth.clerk-layout-pattern.md` - ClerkProvider configuration
- `.readme/chunks/i18n.clerk-localization.md` - Clerk localization
