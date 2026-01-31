'use client';

import { useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder?: string;
  handMode?: 'left' | 'right';
}

export function NotesField({
  value,
  onChange,
  visible,
  onToggleVisible,
  placeholder = 'Add any additional notes...',
  handMode = 'right',
}: NotesFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (visible && textareaRef.current) {
      // Small delay to ensure the textarea is rendered
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textareaRef.current?.focus();
      }, 50);
    }
  }, [visible]);

  if (handMode === 'left') {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={onToggleVisible}
          className="text-sm text-primary hover:opacity-80"
        >
          {visible ? 'Hide notes' : 'Add notes'}
        </button>

        {visible && (
          <div className="max-w-fit">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              rows={4}
            />
          </div>
        )}
      </div>
    );
  }

  // Right-hand mode
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[130px_1fr] items-start gap-4">
        <Label className="pt-2 text-muted-foreground">Notes</Label>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onToggleVisible}
            className="text-sm text-primary hover:opacity-80"
          >
            {visible ? 'Hide' : 'Add'}
          </button>
        </div>
      </div>

      {visible && (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
        />
      )}
    </div>
  );
}
