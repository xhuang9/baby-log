import type { Appearance } from '@clerk/types';
import { shadcn } from '@clerk/themes';

// Shadcn theme for Clerk components
// Uses CSS variables that automatically respond to light/dark mode changes
export const clerkAppearance: Appearance = {
  baseTheme: shadcn,
  variables: {
    // Use CSS variables from global.css - these automatically update when theme changes
    colorPrimary: 'var(--primary)',
    colorBackground: 'var(--card)',
    colorInputBackground: 'var(--input)',
    colorInputText: 'var(--foreground)',
    colorText: 'var(--foreground)',
    colorTextSecondary: 'var(--muted-foreground)',
    colorDanger: 'var(--destructive)',
    colorSuccess: 'hsl(142.1 76.2% 36.3%)',
    fontFamily: 'inherit',
    borderRadius: 'var(--radius-sm)',
  },
  elements: {
    userButtonPopoverCard: 'bg-card text-foreground border border-border',
    headerTitle: 'text-2xl font-semibold text-foreground',
    headerSubtitle: 'text-sm text-muted-foreground',
    socialButtonsBlockButton:
      'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm',
    formFieldInput:
      'border border-input bg-background text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    formFieldLabel: 'text-sm font-medium leading-none text-foreground',
    footerActionLink: 'text-primary hover:text-primary/90 font-medium',
    identityPreviewText: 'text-foreground',
    identityPreviewEditButtonIcon: 'text-muted-foreground',
  },
};
