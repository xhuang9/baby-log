import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

type FieldSectionProps = {
  label: string;
  handMode: 'left' | 'right';
  children: ReactNode;
};

export function FieldSection({ label, handMode, children }: FieldSectionProps) {
  if (handMode === 'left') {
    // Vertical: label above content, left-aligned, content constrained
    return (
      <div className="space-y-4">
        <Label className="text-muted-foreground">{label}</Label>
        <div className="max-w-fit">{children}</div>
      </div>
    );
  }
  // Right: grid with 130px label column, content right-aligned
  return (
    <div className="grid grid-cols-[130px_1fr] items-start gap-4">
      <Label className="pt-2 text-muted-foreground">{label}</Label>
      <div className="flex flex-col items-end">{children}</div>
    </div>
  );
}
