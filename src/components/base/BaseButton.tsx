'use client';

import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const baseButtonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border bg-background text-foreground hover:bg-muted',
      },
      size: {
        default: 'h-11 px-6 py-2 text-base',
        sm: 'h-9 px-4 py-2 text-sm',
        lg: 'h-12 px-8 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export type BaseButtonProps = ComponentProps<'button'>
  & VariantProps<typeof baseButtonVariants> & {
    loading?: boolean;
  };

const BaseButton = ({ ref, className, variant = 'primary', size, loading, disabled, children, ...props }: BaseButtonProps & { ref?: React.RefObject<HTMLButtonElement | null> }) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(baseButtonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading
        ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </>
          )
        : (
            children

          )}
    </button>
  );
};

BaseButton.displayName = 'BaseButton';

export { BaseButton, baseButtonVariants };
