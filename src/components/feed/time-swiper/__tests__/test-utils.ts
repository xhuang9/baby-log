import { vi } from 'vitest';

/**
 * Mock the user store consistently across tests
 */
export async function mockUserStore(userId = 1) {
  const { useUserStore } = await import('@/stores/useUserStore');
  vi.mocked(useUserStore).mockImplementation((selector?: any) => {
    const state = {
      user: { localId: userId, clerkId: `clerk-${userId}` },
      isHydrated: true,
    };
    return selector ? selector(state) : state;
  });
}

/**
 * Mock UI config helper with default TimeSwiper settings
 */
export async function mockUIConfig(overrides?: Partial<{
  use24Hour: boolean;
  swipeSpeed: number;
  swipeResistance: 'smooth' | 'default' | 'sticky';
  showCurrentTime: boolean;
  markerMode: 'line' | 'triangle';
}>) {
  const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

  const defaultSettings = {
    use24Hour: false,
    swipeSpeed: 1.0,
    swipeResistance: 'default' as const,
    showCurrentTime: true,
    markerMode: 'line' as const,
  };

  vi.mocked(getUIConfig).mockResolvedValue({
    userId: 1,
    data: { timeSwiper: { ...defaultSettings, ...overrides } },
    keyUpdatedAt: {},
    schemaVersion: 1,
    updatedAt: new Date(),
  });
}

/**
 * Simulate a pointer drag gesture for testing swipe interactions
 */
export function simulatePointerDrag(
  element: HTMLElement,
  startX: number,
  endX: number,
  steps = 5
) {
  const pointerId = 1;

  element.dispatchEvent(
    new PointerEvent('pointerdown', {
      clientX: startX,
      pointerId,
      bubbles: true,
    })
  );

  const deltaX = (endX - startX) / steps;
  for (let i = 1; i <= steps; i++) {
    element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: startX + deltaX * i,
        pointerId,
        bubbles: true,
      })
    );
  }

  element.dispatchEvent(
    new PointerEvent('pointerup', {
      clientX: endX,
      pointerId,
      bubbles: true,
    })
  );
}

/**
 * Set the test time to a specific date string
 */
export function setTestTime(dateString: string) {
  vi.setSystemTime(new Date(dateString));
}

/**
 * Advance timers by specified milliseconds
 */
export function advanceTime(ms: number) {
  vi.advanceTimersByTime(ms);
}

/**
 * Setup animation frame mocking for tests that need RAF control
 */
export function setupAnimationFrameMock() {
  let animationFrameId = 0;
  const animationFrameCallbacks = new Map<number, FrameRequestCallback>();

  global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = ++animationFrameId;
    animationFrameCallbacks.set(id, callback);
    return id;
  });

  global.cancelAnimationFrame = vi.fn((id: number) => {
    animationFrameCallbacks.delete(id);
  });

  /**
   * Trigger all pending animation frame callbacks
   */
  const triggerNextFrame = (timestamp = performance.now()) => {
    const callbacks = Array.from(animationFrameCallbacks.values());
    animationFrameCallbacks.clear();
    callbacks.forEach((cb) => cb(timestamp));
  };

  return { triggerNextFrame };
}
