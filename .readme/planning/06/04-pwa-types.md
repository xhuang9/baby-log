# Task 04: Update next-pwa TypeScript Definitions

**Status:** [x] Complete

## Problem

`src/types/next-pwa.d.ts` is missing type definitions for `fallbacks` and `workboxOptions`, causing TypeScript errors.

## Fix

Add the missing types to the declaration file.

## File to Edit

`src/types/next-pwa.d.ts`

## Complete Replacement

Replace the entire file with:

```typescript
declare module 'next-pwa' {
  import type { NextConfig } from 'next';

  type PWAConfig = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    sw?: string;
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
    workboxOptions?: {
      importScripts?: string[];
      skipWaiting?: boolean;
      clientsClaim?: boolean;
      runtimeCaching?: Array<{
        urlPattern: RegExp | string;
        handler: string;
        options?: Record<string, unknown>;
      }>;
    };
    runtimeCaching?: Array<{
      urlPattern: RegExp;
      handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly';
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        rangeRequests?: boolean;
        networkTimeoutSeconds?: number;
      };
    }>;
  };

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}
```

## Checklist

- [x] Open `src/types/next-pwa.d.ts`
- [x] Replace entire file content
- [x] Verify no TS errors: `pnpm check:types`

## Notes

- Added `fallbacks` object type
- Added `workboxOptions` with `importScripts` array
- These match the actual next-pwa runtime API
