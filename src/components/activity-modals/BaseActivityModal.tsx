'use client';

import type { ReactNode } from 'react';
import type { HandMode } from '@/lib/local-db/types/entities';
import { ChevronLeft } from 'lucide-react';
import { BaseButton } from '@/components/base/BaseButton';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type BaseActivityModalProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  onPrimary: () => void | Promise<void>;
  primaryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  onDelete?: () => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  handMode?: HandMode;
};

/**
 * Reusable base modal component for activity logs (edit, update, delete)
 * Provides consistent shell, header, footer, and action layout
 */
export function BaseActivityModal({
  title,
  open,
  onOpenChange,
  children,
  onPrimary,
  primaryLabel = 'Save',
  onSecondary,
  secondaryLabel = 'Cancel',
  onDelete,
  isLoading = false,
  error,
  handMode = 'right',
}: BaseActivityModalProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && onSecondary) {
      onSecondary();
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-0 flex h-full w-full flex-col gap-0 rounded-none p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="relative mx-auto w-full max-w-[600px] flex-shrink-0 flex-row items-center space-y-0 border-b px-4 pt-4 pb-4">
          <SheetClose
            render={(
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              />
            )}
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            {title}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div
          className="mx-auto w-full max-w-[600px] flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {children}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="mx-auto w-full max-w-[600px] flex-shrink-0 flex-row border-t px-4 pt-4 pb-4">
          {/* Delete button aligned left */}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
              className="mr-auto h-11 rounded-full px-6 py-2 text-base font-semibold"
            >
              Delete
            </Button>
          )}

          {/* Primary/Secondary buttons with hand mode support */}
          <div className="flex gap-3">
            {handMode === 'left'
              ? (
                  <>
                    <BaseButton
                      variant="primary"
                      onClick={onPrimary}
                      disabled={isLoading}
                    >
                      {primaryLabel}
                    </BaseButton>
                    {onSecondary && (
                      <BaseButton
                        variant="secondary"
                        onClick={() => handleOpenChange(false)}
                        disabled={isLoading}
                      >
                        {secondaryLabel}
                      </BaseButton>
                    )}
                  </>
                )
              : (
                  <>
                    {onSecondary && (
                      <BaseButton
                        variant="secondary"
                        onClick={() => handleOpenChange(false)}
                        disabled={isLoading}
                      >
                        {secondaryLabel}
                      </BaseButton>
                    )}
                    <BaseButton
                      variant="primary"
                      onClick={onPrimary}
                      disabled={isLoading}
                    >
                      {primaryLabel}
                    </BaseButton>
                  </>
                )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
