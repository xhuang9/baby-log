import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { useTimeSwiperSettings } from '../../hooks/useTimeSwiperSettings';
import { mockUIConfig } from '../test-utils';

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
        const use24Hour = await page.getByTestId('use24Hour').element();
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
        const resistance = await page.getByTestId('swipeResistance').element();
        expect(resistance.textContent).toBe('sticky');
      });
    });

    it('should handle loading errors gracefully', async () => {
      const { getUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(getUIConfig).mockRejectedValue(new Error('DB error'));

      // Should not throw, should use defaults
      render(<TestWrapper />);

      await vi.waitFor(async () => {
        const use24Hour = await page.getByTestId('use24Hour').element();
        expect(use24Hour.textContent).toBe('false'); // Default fallback
      });
    });
  });

  describe('Updating Settings', () => {
    it('should mark settings as dirty when changed', async () => {
      render(<TestWrapper />);

      // Wait for initial load
      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('false');
      });

      // Change a setting
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      // Should be dirty
      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('true');
      });
    });

    it('should update setting value locally', async () => {
      render(<TestWrapper />);

      const setSpeedBtn = await page.getByTestId('set-speed-fast').element();
      await setSpeedBtn.click();

      await vi.waitFor(async () => {
        const speed = await page.getByTestId('swipeSpeed').element();
        expect(speed.textContent).toBe('2');
      });
    });

    it('should update multiple settings independently', async () => {
      render(<TestWrapper />);

      const toggle24h = await page.getByTestId('toggle-24h').element();
      const setStickyBtn = await page.getByTestId('set-resistance-sticky').element();

      await toggle24h.click();
      await setStickyBtn.click();

      await vi.waitFor(async () => {
        const use24Hour = await page.getByTestId('use24Hour').element();
        const resistance = await page.getByTestId('swipeResistance').element();

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
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      // Save
      const saveBtn = await page.getByTestId('save-btn').element();
      await saveBtn.click();

      // Should call updateUIConfig
      await vi.waitFor(() => {
        expect(updateUIConfig).toHaveBeenCalledWith(
          1, // userId
          'timeSwiper',
          expect.objectContaining({
            use24Hour: true,
          })
        );
      });
    });

    it('should close settings popover after save', async () => {
      render(<TestWrapper />);

      // Open settings
      const openBtn = await page.getByTestId('open-settings').element();
      await openBtn.click();

      await vi.waitFor(async () => {
        const isOpen = await page.getByTestId('isOpen').element();
        expect(isOpen.textContent).toBe('true');
      });

      // Make a change and save
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      const saveBtn = await page.getByTestId('save-btn').element();
      await saveBtn.click();

      // Should close
      await vi.waitFor(async () => {
        const isOpen = await page.getByTestId('isOpen').element();
        expect(isOpen.textContent).toBe('false');
      });
    });

    it('should NOT save if not dirty', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      render(<TestWrapper />);

      // Wait for initial load
      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('false');
      });

      // Try to save without changes
      const saveBtn = await page.getByTestId('save-btn').element();
      await saveBtn.click();

      // Should NOT call updateUIConfig
      expect(updateUIConfig).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      const { updateUIConfig } = await import('@/lib/local-db/helpers/ui-config');

      vi.mocked(updateUIConfig).mockRejectedValue(new Error('Save failed'));

      render(<TestWrapper />);

      // Make a change
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      // Try to save (should not throw)
      const saveBtn = await page.getByTestId('save-btn').element();
      expect(async () => {
        await saveBtn.click();
      }).not.toThrow();
    });

    it('should clear dirty flag after successful save', async () => {
      render(<TestWrapper />);

      // Make a change
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('true');
      });

      // Save
      const saveBtn = await page.getByTestId('save-btn').element();
      await saveBtn.click();

      // Should clear dirty flag
      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('false');
      });
    });
  });

  describe('Canceling Changes', () => {
    it('should revert to saved settings', async () => {
      render(<TestWrapper />);

      // Original value
      let use24Hour = await page.getByTestId('use24Hour').element();
      const originalValue = use24Hour.textContent;

      // Make a change
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      await vi.waitFor(async () => {
        use24Hour = await page.getByTestId('use24Hour').element();
        expect(use24Hour.textContent).not.toBe(originalValue);
      });

      // Cancel
      const cancelBtn = await page.getByTestId('cancel-btn').element();
      await cancelBtn.click();

      // Should revert
      await vi.waitFor(async () => {
        use24Hour = await page.getByTestId('use24Hour').element();
        expect(use24Hour.textContent).toBe(originalValue);
      });
    });

    it('should close settings popover after cancel', async () => {
      render(<TestWrapper />);

      // Open settings
      const openBtn = await page.getByTestId('open-settings').element();
      await openBtn.click();

      await vi.waitFor(async () => {
        const isOpen = await page.getByTestId('isOpen').element();
        expect(isOpen.textContent).toBe('true');
      });

      // Cancel
      const cancelBtn = await page.getByTestId('cancel-btn').element();
      await cancelBtn.click();

      // Should close
      await vi.waitFor(async () => {
        const isOpen = await page.getByTestId('isOpen').element();
        expect(isOpen.textContent).toBe('false');
      });
    });

    it('should clear dirty flag after cancel', async () => {
      render(<TestWrapper />);

      // Make a change
      const toggle24h = await page.getByTestId('toggle-24h').element();
      await toggle24h.click();

      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('true');
      });

      // Cancel
      const cancelBtn = await page.getByTestId('cancel-btn').element();
      await cancelBtn.click();

      // Should clear dirty flag
      await vi.waitFor(async () => {
        const isDirty = await page.getByTestId('isDirty').element();
        expect(isDirty.textContent).toBe('false');
      });
    });

    it('should revert multiple changed settings', async () => {
      render(<TestWrapper />);

      // Get original values
      let use24Hour = await page.getByTestId('use24Hour').element();
      let resistance = await page.getByTestId('swipeResistance').element();
      const originalUse24Hour = use24Hour.textContent;
      const originalResistance = resistance.textContent;

      // Change multiple settings
      const toggle24h = await page.getByTestId('toggle-24h').element();
      const setStickyBtn = await page.getByTestId('set-resistance-sticky').element();

      await toggle24h.click();
      await setStickyBtn.click();

      // Verify changes
      await vi.waitFor(async () => {
        use24Hour = await page.getByTestId('use24Hour').element();
        resistance = await page.getByTestId('swipeResistance').element();
        expect(use24Hour.textContent).not.toBe(originalUse24Hour);
        expect(resistance.textContent).toBe('sticky');
      });

      // Cancel
      const cancelBtn = await page.getByTestId('cancel-btn').element();
      await cancelBtn.click();

      // Should revert all
      await vi.waitFor(async () => {
        use24Hour = await page.getByTestId('use24Hour').element();
        resistance = await page.getByTestId('swipeResistance').element();
        expect(use24Hour.textContent).toBe(originalUse24Hour);
        expect(resistance.textContent).toBe(originalResistance);
      });
    });
  });

  describe('Settings Popover State', () => {
    it('should toggle popover open/closed', async () => {
      render(<TestWrapper />);

      const openBtn = await page.getByTestId('open-settings').element();
      const closeBtn = await page.getByTestId('close-settings').element();

      // Open
      await openBtn.click();
      await vi.waitFor(async () => {
        const isOpen = await page.getByTestId('isOpen').element();
        expect(isOpen.textContent).toBe('true');
      });

      // Close
      await closeBtn.click();
      await vi.waitFor(async () => {
        const isOpen = await page.getByTestId('isOpen').element();
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
        const resistance = await page.getByTestId('swipeResistance').element();
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
        const resistance = await page.getByTestId('swipeResistance').element();
        expect(resistance.textContent).toBe('smooth');
      });
    });
  });
});
