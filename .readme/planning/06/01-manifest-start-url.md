# Task 01: Fix Manifest Start URL

**Status:** [x] Complete

## Problem

`public/manifest.json` has `start_url: "/dashboard"` but no such route exists. This causes PWA installs to open to 404.

## Fix

Change `start_url` from `/dashboard` to `/en/overview`.

## File to Edit

`public/manifest.json`

## Exact Change

```diff
- "start_url": "/dashboard",
+ "start_url": "/en/overview",
```

## Checklist

- [x] Edit `public/manifest.json` line 10
- [x] Change `"/dashboard"` to `"/en/overview"`

## Validation

```bash
# Check the file
grep start_url public/manifest.json
# Should output: "start_url": "/en/overview",
```

## Notes

- Using `/en/overview` because the app has locale prefixes
- The root `/` redirects to locale-prefixed routes
