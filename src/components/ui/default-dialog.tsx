'use client';

import { X } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type DefaultDialogProps = {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
};

export function DefaultDialog({
  trigger,
  children,
  open,
  onOpenChange,
  title,
}: DefaultDialogProps) {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild={true}>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        className={cn(
          'overflow-y-auto p-0 gap-0',
          // Mobile: Full screen
          isMobile
            ? 'h-screen w-screen max-w-none rounded-none translate-x-[-50%] translate-y-[-50%]'
            : 'max-h-[90vh] max-w-lg md:max-w-xl lg:max-w-2xl',
        )}
      >
        {/* Header */}
        <DialogHeader>
          {title && <DialogTitle className="text-base font-semibold">{title}</DialogTitle>}
          <DialogClose asChild={true}>
            <Button variant="ghost" size="icon" className="absolute right-2">
              <X className="size-5" />
            </Button>
          </DialogClose>
        </DialogHeader>

        {/* Content */}
        <DialogDescription className="p-6">{children}</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
