# Phase 2a: Toast API

## Goal

Create a unified toast API with Zustand store integration and update Sonner configuration.

---

## Dependencies

- None (can be done in parallel with Phase 1)

---

## Files to Create

### `src/stores/useToastStore.ts`

```typescript
import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
  shown: boolean;
}

interface ToastState {
  queue: ToastItem[];
  enqueue: (item: Omit<ToastItem, 'id' | 'shown'>) => void;
  markShown: (id: string) => void;
  clear: () => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  queue: [],

  enqueue: (item) => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      queue: [...state.queue, { ...item, id, shown: false }],
    }));
  },

  markShown: (id) => {
    set((state) => ({
      queue: state.queue.map((t) =>
        t.id === id ? { ...t, shown: true } : t
      ),
    }));

    // Clean up shown toasts after a delay
    setTimeout(() => {
      set((state) => ({
        queue: state.queue.filter((t) => t.id !== id),
      }));
    }, 500);
  },

  clear: () => set({ queue: [] }),
}));
```

### `src/lib/notify/toast.ts`

```typescript
import { useToastStore } from '@/stores/useToastStore';

// Default durations (milliseconds)
const DURATION = {
  success: 3000,
  error: 5000,
  warning: 5000,
  info: 3000,
} as const;

interface ToastOptions {
  duration?: number;
}

function enqueue(
  variant: 'success' | 'error' | 'warning' | 'info',
  message: string,
  options?: ToastOptions
) {
  useToastStore.getState().enqueue({
    variant,
    message,
    duration: options?.duration ?? DURATION[variant],
  });
}

export const notifyToast = {
  success: (message: string, options?: ToastOptions) =>
    enqueue('success', message, options),

  error: (message: string, options?: ToastOptions) =>
    enqueue('error', message, options),

  warning: (message: string, options?: ToastOptions) =>
    enqueue('warning', message, options),

  info: (message: string, options?: ToastOptions) =>
    enqueue('info', message, options),
};
```

### `src/components/ToastHost.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useToastStore } from '@/stores/useToastStore';

export function ToastHost() {
  const queue = useToastStore((s) => s.queue);
  const markShown = useToastStore((s) => s.markShown);

  useEffect(() => {
    const unshown = queue.filter((t) => !t.shown);

    unshown.forEach((item) => {
      const options = { duration: item.duration };

      switch (item.variant) {
        case 'success':
          toast.success(item.message, options);
          break;
        case 'error':
          toast.error(item.message, options);
          break;
        case 'warning':
          toast.warning(item.message, options);
          break;
        case 'info':
          toast.info(item.message, options);
          break;
      }

      markShown(item.id);
    });
  }, [queue, markShown]);

  return null;
}
```

---

## Files to Modify

### `src/components/ui/sonner.tsx`

Update default durations:

```typescript
// Before (if hardcoded):
// duration={1500}

// After:
// Remove hardcoded duration - let individual toasts control it
// Or set sensible defaults:

<Toaster
  theme={theme}
  position="top-center"
  toastOptions={{
    duration: 3000, // Default fallback
    classNames: {
      // ... existing classes
    },
  }}
/>
```

### `src/app/[locale]/layout.tsx`

Add ToastHost to the layout:

```typescript
import { ToastHost } from '@/components/ToastHost';

// Inside the layout, alongside Toaster:
<Toaster />
<ToastHost />
```

---

## Migration Guide

Replace direct `toast.*` calls with `notifyToast.*`:

```typescript
// Before
import { toast } from 'sonner';
toast.success('Saved');
toast.error('Failed to save');

// After
import { notifyToast } from '@/lib/notify/toast';
notifyToast.success('Saved');
notifyToast.error('Failed to save');
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Trigger a toast via `notifyToast.success('Test')`
3. Verify toast appears at top-center
4. Verify success toast dismisses after 3s
5. Verify error toast stays for 5s

---

## Status

⏳ Pending
