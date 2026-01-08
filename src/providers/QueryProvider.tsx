'use client';

/**
 * TanStack Query Provider
 *
 * Provides the QueryClient for data fetching and sync scheduling.
 *
 * IMPORTANT: TanStack Query is an EPHEMERAL scheduler, NOT a persistence layer.
 * - The durable store is IndexedDB (Dexie) in src/lib/local-db.ts
 * - TanStack Query schedules sync pulls and handles retry logic
 * - No @tanstack/react-query-persist-client is used
 *
 * @see .readme/task/llm-chat.md for architecture decisions
 */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Short stale time - triggers sync checks frequently
        staleTime: 1000 * 5, // 5 seconds

        // Short gc time - data lives in Dexie, not in React Query cache
        gcTime: 1000 * 60 * 5, // 5 minutes

        // Auto-sync on focus/reconnect
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,

        // Retry configuration for network errors
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Retry mutations that fail due to network
        retry: 2,
        retryDelay: 1000,
      },
    },
  });
}

// Singleton for SSR - prevents creating new client on every render
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: reuse existing client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  // Using useState to ensure consistent client between renders
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
