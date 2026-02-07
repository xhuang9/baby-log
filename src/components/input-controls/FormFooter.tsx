'use client';

import { BaseButton } from '@/components/base/BaseButton';
import { cn } from '@/lib/utils';

type FormFooterProps = {
  /** Primary action (Save/Submit) - not needed if primaryType="submit" */
  onPrimary?: () => void;
  /** Primary button label */
  primaryLabel?: string;
  /** Primary button type - use "submit" for form submission */
  primaryType?: 'button' | 'submit';
  /** Secondary action (Cancel/Back) */
  onSecondary: () => void;
  /** Secondary button label */
  secondaryLabel?: string;
  /** Whether primary action is in progress */
  isLoading?: boolean;
  /** Whether buttons are disabled */
  disabled?: boolean;
  /** Hand mode - affects button order (left = primary on left) */
  handMode?: 'left' | 'right';
  /** Additional class for container */
  className?: string;
};

/**
 * Reusable form footer with primary/secondary buttons.
 * Button order respects hand mode preference.
 */
export function FormFooter({
  onPrimary,
  primaryLabel = 'Save',
  primaryType = 'button',
  onSecondary,
  secondaryLabel = 'Cancel',
  isLoading = false,
  disabled = false,
  handMode = 'right',
  className,
}: FormFooterProps) {
  const primaryButton = (
    <BaseButton
      variant="primary"
      type={primaryType}
      onClick={primaryType === 'button' ? onPrimary : undefined}
      loading={isLoading}
      disabled={disabled}
    >
      {primaryLabel}
    </BaseButton>
  );

  const secondaryButton = (
    <BaseButton
      variant="secondary"
      type="button"
      onClick={onSecondary}
      disabled={isLoading}
    >
      {secondaryLabel}
    </BaseButton>
  );

  return (
    <div className={cn('flex gap-3', className)}>
      {handMode === 'left'
        ? (
            <>
              {primaryButton}
              {secondaryButton}
            </>
          )
        : (
            <>
              {secondaryButton}
              {primaryButton}
            </>
          )}
    </div>
  );
}
