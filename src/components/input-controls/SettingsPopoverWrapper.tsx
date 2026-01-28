'use client';

import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SettingsPopoverWrapperProps = {
  /** Title displayed at top of popover */
  title: string;
  /** The settings panel content */
  children: React.ReactNode;
  /** Close the popover */
  onClose: () => void;
  /** Save and close */
  onSave: () => void;
  /** Close and revert any unsaved changes */
  onCancel: () => void;
  /** Whether there are unsaved changes */
  isDirty?: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Hand mode - affects button order (left = save on left) */
  handMode?: 'left' | 'right';
};

export function SettingsPopoverWrapper({
  title,
  children,
  onClose,
  onSave,
  onCancel,
  isDirty = false,
  isSaving = false,
  handMode = 'right',
}: SettingsPopoverWrapperProps) {
  const saveButton = (
    <Button
      size="sm"
      onClick={onSave}
      disabled={isSaving}
      className="flex-1"
    >
      {isSaving ? 'Saving...' : 'Save'}
    </Button>
  );

  const closeButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={onCancel}
      disabled={isSaving}
      className="flex-1"
    >
      Close
    </Button>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">{title}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {children}

      {/* Save/Close Buttons - order based on hand mode */}
      <div className="flex gap-2 pt-2">
        {handMode === 'left'
          ? (
              <>
                {saveButton}
                {closeButton}
              </>
            )
          : (
              <>
                {closeButton}
                {saveButton}
              </>
            )}
      </div>
    </div>
  );
}
