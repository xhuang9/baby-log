import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useInitializeSleepForm } from './useInitializeSleepForm';

// Utility to wait for element
async function waitForElement(testId: string) {
  return vi.waitFor(() => page.getByTestId(testId).element(), {
    timeout: 3000,
  });
}

// Mock dependencies - must not reference external variables
vi.mock('@/lib/local-db/helpers/ui-config');

vi.mock('@/stores/useTimerStore');

vi.mock('@/stores/useUserStore');

// Test component wrapper
function TestWrapper({
  isTimerHydrated,
  setHandMode,
}: {
  isTimerHydrated: boolean;
  setHandMode: (mode: 'left' | 'right') => void;
}) {
  useInitializeSleepForm({ isTimerHydrated, setHandMode });
  return <div data-testid="initialized">Initialized</div>;
}

describe('useInitializeSleepForm', () => {
  const mockSetHandMode = vi.fn();
  const mockHydrate = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');
    const { useTimerStore } = await import('@/stores/useTimerStore');
    const { useUserStore } = await import('@/stores/useUserStore');

    // Setup getUIConfig mock
    vi.mocked(getUIConfig).mockResolvedValue({
      success: true,
      data: { handMode: 'right' },
    } as any);

    // Setup useTimerStore mock to return hydrate function when called with selector
    vi.mocked(useTimerStore).mockImplementation((selector: any) => {
      const store = { hydrate: mockHydrate };
      return selector ? selector(store) : store;
    });

    // Setup useUserStore mock to return user when called with selector
    vi.mocked(useUserStore).mockImplementation((selector: any) => {
      const store = {
        user: {
          localId: 1,
          clerkUserId: 'user_123',
          email: 'test@example.com',
        },
      };
      return selector ? selector(store) : store;
    });
  });

  it('should hydrate timer when user is available and not hydrated', async () => {
    render(
      <TestWrapper
        isTimerHydrated={false}
        setHandMode={mockSetHandMode}
      />,
    );

    // Wait for effects to run
    await waitForElement('initialized');

    expect(mockHydrate).toHaveBeenCalledWith(1);
  });

  it('should not hydrate timer if already hydrated', async () => {
    render(
      <TestWrapper
        isTimerHydrated={true}
        setHandMode={mockSetHandMode}
      />,
    );

    await waitForElement('initialized');

    expect(mockHydrate).not.toHaveBeenCalled();
  });

  it('should load hand mode from IndexedDB', async () => {
    const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

    vi.mocked(getUIConfig).mockResolvedValue({
      success: true,
      data: { handMode: 'left' },
    } as any);

    render(
      <TestWrapper isTimerHydrated={true} setHandMode={mockSetHandMode} />,
    );

    await waitForElement('initialized');

    // Wait for async effect
    await vi.waitFor(() => {
      expect(mockSetHandMode).toHaveBeenCalledWith('left');
    });
  });

  it('should use default hand mode if config does not specify handMode', async () => {
    const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

    vi.mocked(getUIConfig).mockResolvedValue({
      success: true,
      data: { handMode: undefined },
    } as any);

    render(
      <TestWrapper isTimerHydrated={true} setHandMode={mockSetHandMode} />,
    );

    await waitForElement('initialized');

    await vi.waitFor(() => {
      expect(mockSetHandMode).toHaveBeenCalledWith('right');
    });
  });

  it('should handle IndexedDB errors gracefully', async () => {
    const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    vi.mocked(getUIConfig).mockRejectedValue(new Error('DB error'));

    render(
      <TestWrapper isTimerHydrated={true} setHandMode={mockSetHandMode} />,
    );

    await waitForElement('initialized');

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load hand mode:',
        expect.any(Error),
      );
    });

    // Should not crash and should not call setHandMode
    expect(mockSetHandMode).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
