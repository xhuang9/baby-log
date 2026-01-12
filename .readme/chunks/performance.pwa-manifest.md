---
last_verified_at: 2026-01-04T12:00:00Z
source_paths:
  - public/manifest.json
  - src/app/[locale]/layout.tsx
---

# PWA Manifest Configuration

## Purpose
Configures Progressive Web App installation behavior, appearance, and metadata for mobile and desktop installation.

## Key Deviations from Standard
- **Dashboard Start URL**: Opens directly to `/dashboard` instead of homepage when launched as installed app
- **Portrait Orientation**: Locked to portrait mode (mobile-first design)
- **Theme Color**: Adapts to system light/dark mode via meta tags

## Implementation

### manifest.json
```json
{
  "name": "Next.js Boilerplate",
  "short_name": "Next.js BP",
  "description": "Production-ready Next.js boilerplate",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait"
}
```

### Layout Integration
```tsx
// src/app/[locale]/layout.tsx
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
</head>;
```

## Configuration Options

### Display Modes
- **standalone**: App runs without browser UI (current setting)
- **fullscreen**: Hides status bar (immersive)
- **minimal-ui**: Minimal browser controls
- **browser**: Normal browser tab

### Start URL Behavior
When user launches installed PWA:
1. Opens `/dashboard` (not homepage)
2. Bypasses authentication if already logged in
3. Redirects to sign-in if session expired

**Rationale**: Users installing the app want direct access to functionality, not marketing pages.

### Orientation Lock
```json
"orientation": "portrait"
```
**Effect**: App cannot rotate to landscape on mobile devices
**Customization**: Change to `"any"` for both orientations, or `"landscape"` for landscape-only

### Theme Colors
**Dark Mode**: `#000000` (black)
**Light Mode**: `#ffffff` (white)

**Effect**: Status bar and app chrome match theme
**Media Queries**: Automatically switches based on system preference

## Patterns

### Adding App Icons
```json
{
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Required Sizes**: 192x192, 512x512 (minimum for Chrome)
**Purpose**:
- `any` - Normal icon display
- `maskable` - Adaptive icon for Android (icon safe zone)

### Installation Flow
1. User visits site multiple times (engagement signal)
2. Browser shows "Install App" prompt (if eligible)
3. User clicks "Install" → App added to home screen
4. Launched app opens to `/dashboard` in standalone mode

## Gotchas
- **HTTPS Required**: PWA installation only works on HTTPS (or localhost)
- **Engagement Required**: Browser decides when to show install prompt (cannot force)
- **Icon Caching**: Manifest icons are heavily cached - use cache-busting if updating
- **Start URL Validation**: Must be same-origin, will fail silently if invalid

## Testing Installation

### Chrome Desktop
1. Build and run: `npm run build && npm start`
2. Open Chrome → DevTools → Application → Manifest
3. Verify no errors
4. Click "Add to Home Screen" in Chrome menu (⋮)

### Mobile Testing
1. Deploy to HTTPS domain or use ngrok
2. Visit site on mobile browser
3. Look for "Add to Home Screen" banner
4. Install and verify start URL behavior

### Debugging
```bash
# Chrome DevTools → Application → Manifest
# Check for errors:
- ✗ Start URL not within scope
- ✗ No matching service worker
- ✗ Icon sizes missing
```

## Related
- `.readme/chunks/performance.pwa-config.md` - Service worker and caching configuration
- `.readme/chunks/auth.clerk-layout-pattern.md` - Authentication for start URL
