---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - public/manifest.json
  - src/app/[locale]/layout.tsx
---

# PWA Manifest Configuration

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Define install metadata (name, icons, start URL, and theme colors) for the Baby Log PWA.

## Key Deviations from Standard

- **Locale-specific start URL**: `start_url` points to `/en/overview` instead of a marketing homepage.
- **Minimal icon set**: Uses existing favicon and apple-touch icons rather than dedicated PWA assets.

## Architecture / Implementation

### Components
- `public/manifest.json` - PWA manifest metadata.
- `src/app/[locale]/layout.tsx` - Adds `manifest` link and theme color metadata.

### Data Flow
1. Browser reads `manifest.json` to decide install metadata.
2. Root layout provides `manifest` and theme color meta tags.

### Code Pattern
```json
{
  "name": "Baby Log",
  "start_url": "/en/overview",
  "display": "standalone",
  "orientation": "portrait"
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `start_url` | `/en/overview` | Launch page for the installed app.
| `scope` | `/` | Ensures all routes fall within the PWA scope.
| `display` | `standalone` | Runs without browser chrome.
| `orientation` | `portrait` | Locks orientation to portrait.

## Gotchas / Constraints

- **Locale coupling**: `start_url` is hard-coded to English; update if non-default locales are added.
- **Icon coverage**: Only favicons and `apple-touch-icon` are listed; some platforms may expect 192/512 icons.

## Testing Notes

- Open DevTools → Application → Manifest to validate icon and start URL.
- Install the app and verify it launches to `/en/overview`.

## Related Systems

- `.readme/chunks/performance.pwa-config.md` - Service worker configuration.
- `.readme/chunks/i18n.routing-integration.md` - Locale routing behavior.
