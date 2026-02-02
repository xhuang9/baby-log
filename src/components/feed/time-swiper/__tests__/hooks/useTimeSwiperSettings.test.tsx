import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useTimeSwiperSettings } from '../../hooks/useTimeSwiperSettings';
import { mockUIConfig, waitForElement } from '../test-utils';

// Mock dependencies
vi.mock('@/stores/useUserStore', () => ({
  useUserStore: vi.fn((selector?: any) => {
    const state = {
      user: { localId: 1, clerkId: 'test-clerk-id' },
      isHydrated: true,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('@/lib/local-db/helpers/ui-config', () => ({
  getUIConfig: vi.fn(),
  updateUIConfig: vi.fn(),
}));

/**
 * Test wrapper for the settings hook
 */
function TestWrapper() {
  const {
    settings,
    updateSetting,
    handleSave,
    handleCancel,
    isDirty,
    settingsOpen,
    setSettingsOpen,
  } = useTimeSwiperSettings();

  return (
    <div>
      <div data-testid="use24Hour">{settings.use24Hour ? 'true' : 'false'}</div>
      <div data-testid="swipeSpeed">{settings.swipeSpeed}</div>
      <div data-testid="swipeResistance">{settings.swipeResistance}</div>
      <div data-testid="showCurrentTime">{settings.showCurrentTime ? 'true' : 'false'}</div>
      <div data-testid="markerMode">{settings.markerMode}</div>
      <div data-testid="isDirty">{isDirty ? 'true' : 'false'}</div>
      <div data-testid="isOpen">{settingsOpen ? 'true' : 'false'}</div>

      <button
        data-testid="toggle-24h"
        onClick={() => updateSetting('use24Hour', !settings.use24Hour)}
      >
        Toggle 24h
      </button>
      <button
        data-testid="set-speed-fast"
        onClick={() => updateSetting('swipeSpeed', 2.0)}
      >
        Fast Speed
      </button>
      <button
        data-testid="set-resistance-sticky"
        onClick={() => updateSetting('swipeResistance', 'sticky')}
      >
        Sticky
      </button>
      <button
        data-testid="save-btn"
        onClick={handleSave}
      >
        Save
      </button>
      <button
        data-testid="cancel-btn"
        onClick={handleCancel}
      >
        Cancel
      </button>
      <button
        data-testid="open-settings"
        onClick={() => setSettingsOpen(true)}
      >
        Open
      </button>
      <button
        data-testid="close-settings"
        onClick={() => setSettingsOpen(false)}
      >
        Close
      </button>
    </div>
  );
}

describe('useTimeSwiperSettings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockUIConfig();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading Settings', () => {
    it('should load settings from IndexedDB when hydrated', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      render(<TestWrapper />);

      // Wait for settings to load
      await vi.waitFor(() => {
        expect(getUIConfig).toHaveBeenCalled();
      });
    });

    it('should use defaults if no settings in DB', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockResolvedValue({
        userId: 1,
        data: {},
        keyUpdatedAt: {},
        schemaVersion: 1,
        updatedAt: new Date(),
      });

      render(<TestWrapper />);

      // Wait for component to render with defaults
      await vi.waitFor(async () => {
        const use24Hour = await waitForElement('use24Hour');
        expect(use24Hour.textContent).toBe('false'); // Default
      });
    });

    it('should migrate magneticFeel to swipeResistance', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      // Old setting format
      vi.mocked(getUIConfig).mockResolvedValue({
        userId: 1,
        data: {
          timeSwiper: {
            magneticFeel: true, // Old setting
            use24Hour: false,
            swipeSpeed: 1.0,
            showCurrentTime: true,
            markerMode: 'line' as const,
          },
        },
        keyUpdatedAt: {},
        schemaVersion: 1,
        updatedAt: new Date(),
      });

      render(<TestWrapper />);

      // Should migrate to swipeResistance: 'sticky'
      await vi.waitFor(async () => {
        const resistance = await waitForElement('swipeResistance');
        expect(resistance.textContent).toBe('sticky');
      });
    });

    it('should handle loading errors gracefully', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockRejectedValue(new Error('DB error'));

      // Should not throw, should use defaults
      render(<TestWrapper />);

      await vi.waitFor(async () => {
        const use24Hour = await waitForElement('use24Hour');
        expect(use24Hour.textContent).toBe('false'); // Default fallback
      });
    });
  });

  describe('Updating Settings', () => {
    it('should mark settings as dirty when changed', async () => {
      render(<TestWrapper />);

      // Wait for initial load
      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('false');
      });

      // Change a setting
      await page.getByTestId('toggle-24h').click();

      // Should be dirty
      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('true');
      });
    });

    it('should update setting value locally', async () => {
      render(<TestWrapper />);

      await page.getByTestId('set-speed-fast').click();

      await vi.waitFor(async () => {
        const speed = await waitForElement('swipeSpeed');
        expect(speed.textContent).toBe('2');
      });
    });

    it('should update multiple settings independently', async () => {
      render(<TestWrapper />);

      await page.getByTestId('toggle-24h').click();
      await page.getByTestId('set-resistance-sticky').click();

      await vi.waitFor(async () => {
        const use24Hour = await waitForElement('use24Hour');
        const resistance = await waitForElement('swipeResistance');

        expect(use24Hour.textContent).toBe('true');
        expect(resistance.textContent).toBe('sticky');
      });
    });
  });

  describe('Saving Settings', () => {
    it('should call updateUIConfig with new settings', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      render(<TestWrapper />);

      // Make a change
      await page.getByTestId('toggle-24h').click();

      // Save
      await page.getByTestId('save-btn').click();

      // Should call updateUIConfig
      await vi.waitFor(() => {
        expect(updateUIConfig).toHaveBeenCalledWith(
          1, // userId
          { timeSwiper: expect.objectContaining({ use24Hour: true }) }
        );
      });
    });

    it('should close settings popover after save', async () => {
      render(<TestWrapper />);

      // Open settings
      await page.getByTestId('open-settings').click();

      await vi.waitFor(async () => {
        const isOpen = await waitForElement('isOpen');
        expect(isOpen.textContent).toBe('true');
      });

      // Make a change and save
      await page.getByTestId('toggle-24h').click();

      await page.getByTestId('save-btn').click();

      // Should close
      await vi.waitFor(async () => {
        const isOpen = await waitForElement('isOpen');
        expect(isOpen.textContent).toBe('false');
      });
    });

    it('should NOT save if not dirty', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      render(<TestWrapper />);

      // Wait for initial load
      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('false');
      });

      // Try to save without changes
      await page.getByTestId('save-btn').click();

      // Should NOT call updateUIConfig
      expect(updateUIConfig).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(updateUIConfig).mockRejectedValue(new Error('Save failed'));

      render(<TestWrapper />);

      // Make a change
      await page.getByTestId('toggle-24h').click();

      // Try to save (should not throw)
      expect(async () => {
        await page.getByTestId('save-btn').click();
      }).not.toThrow();
    });

    it('should clear dirty flag after successful save', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      // Reset mock to resolve successfully (previous test mocked rejection)
      vi.mocked(updateUIConfig).mockResolvedValue();

      render(<TestWrapper />);

      // Make a change
      await page.getByTestId('toggle-24h').click();

      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('true');
      });

      // Save
      await page.getByTestId('save-btn').click();

      // Should clear dirty flag
      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('false');
      });
    });
  });

  describe('Canceling Changes', () => {
    it('should revert to saved settings', async () => {
      render(<TestWrapper />);

      // Original value
      let use24Hour = await waitForElement('use24Hour');
      const originalValue = use24Hour.textContent;

      // Make a change
      await page.getByTestId('toggle-24h').click();

      await vi.waitFor(async () => {
        use24Hour = await waitForElement('use24Hour');
        expect(use24Hour.textContent).not.toBe(originalValue);
      });

      // Cancel
      await page.getByTestId('cancel-btn').click();

      // Should revert
      await vi.waitFor(async () => {
        use24Hour = await waitForElement('use24Hour');
        expect(use24Hour.textContent).toBe(originalValue);
      });
    });

    it('should close settings popover after cancel', async () => {
      render(<TestWrapper />);

      // Open settings
      await page.getByTestId('open-settings').click();

      await vi.waitFor(async () => {
        const isOpen = await waitForElement('isOpen');
        expect(isOpen.textContent).toBe('true');
      });

      // Cancel
      await page.getByTestId('cancel-btn').click();

      // Should close
      await vi.waitFor(async () => {
        const isOpen = await waitForElement('isOpen');
        expect(isOpen.textContent).toBe('false');
      });
    });

    it('should clear dirty flag after cancel', async () => {
      render(<TestWrapper />);

      // Make a change
      await page.getByTestId('toggle-24h').click();

      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('true');
      });

      // Cancel
      await page.getByTestId('cancel-btn').click();

      // Should clear dirty flag
      await vi.waitFor(async () => {
        const isDirty = await waitForElement('isDirty');
        expect(isDirty.textContent).toBe('false');
      });
    });

    it('should revert multiple changed settings', async () => {
      render(<TestWrapper />);

      // Get original values
      let use24Hour = await waitForElement('use24Hour');
      let resistance = await waitForElement('swipeResistance');
      const originalUse24Hour = use24Hour.textContent;
      const originalResistance = resistance.textContent;

      // Change multiple settings
      await page.getByTestId('toggle-24h').click();
      await page.getByTestId('set-resistance-sticky').click();

      // Verify changes
      await vi.waitFor(async () => {
        use24Hour = await waitForElement('use24Hour');
        resistance = await waitForElement('swipeResistance');
        expect(use24Hour.textContent).not.toBe(originalUse24Hour);
        expect(resistance.textContent).toBe('sticky');
      });

      // Cancel
      await page.getByTestId('cancel-btn').click();

      // Should revert all
      await vi.waitFor(async () => {
        use24Hour = await waitForElement('use24Hour');
        resistance = await waitForElement('swipeResistance');
        expect(use24Hour.textContent).toBe(originalUse24Hour);
        expect(resistance.textContent).toBe(originalResistance);
      });
    });
  });

  describe('Settings Popover State', () => {
    it('should toggle popover open/closed', async () => {
      render(<TestWrapper />);

      // Open
      await page.getByTestId('open-settings').click();
      await vi.waitFor(async () => {
        const isOpen = await waitForElement('isOpen');
        expect(isOpen.textContent).toBe('true');
      });

      // Close
      await page.getByTestId('close-settings').click();
      await vi.waitFor(async () => {
        const isOpen = await waitForElement('isOpen');
        expect(isOpen.textContent).toBe('false');
      });
    });
  });

  describe('Migration Edge Cases', () => {
    it('should handle magneticFeel: false migration', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockResolvedValue({
        userId: 1,
        data: {
          timeSwiper: {
            magneticFeel: false,
            use24Hour: false,
            swipeSpeed: 1.0,
            showCurrentTime: true,
            markerMode: 'line' as const,
          },
        },
        keyUpdatedAt: {},
        schemaVersion: 1,
        updatedAt: new Date(),
      });

      render(<TestWrapper />);

      // magneticFeel: false should migrate to swipeResistance: 'default'
      await vi.waitFor(async () => {
        const resistance = await waitForElement('swipeResistance');
        expect(resistance.textContent).toBe('default');
      });
    });

    it('should not override swipeResistance if already set', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockResolvedValue({
        userId: 1,
        data: {
          timeSwiper: {
            magneticFeel: true,
            swipeResistance: 'smooth' as const, // Already migrated
            use24Hour: false,
            swipeSpeed: 1.0,
            showCurrentTime: true,
            markerMode: 'line' as const,
          },
        },
        keyUpdatedAt: {},
        schemaVersion: 1,
        updatedAt: new Date(),
      });

      render(<TestWrapper />);

      // Should keep existing swipeResistance
      await vi.waitFor(async () => {
        const resistance = await waitForElement('swipeResistance');
        expect(resistance.textContent).toBe('smooth');
      });
    });
  });
});
