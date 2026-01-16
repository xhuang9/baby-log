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
    importScripts?: string[];
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
