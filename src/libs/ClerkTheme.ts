import type { Appearance } from '@clerk/types';
import { shadesOfPurple } from '@clerk/themes';

// Shadcn theme for Clerk components
// Using @clerk/themes with custom overrides to match our teal theme
export const clerkAppearance: Appearance = {
  baseTheme: shadesOfPurple,
  variables: {
    colorPrimary: 'hsl(174 66% 45%)', // teal-600 - override purple with our teal
    colorBackground: 'hsl(0 0% 100%)',
    colorInputBackground: 'hsl(0 0% 100%)',
    colorInputText: 'hsl(222.2 84% 4.9%)',
    colorText: 'hsl(222.2 84% 4.9%)',
    colorTextSecondary: 'hsl(215.4 16.3% 46.9%)',
    colorDanger: 'hsl(0 84.2% 60.2%)',
    colorSuccess: 'hsl(142.1 76.2% 36.3%)',
    fontFamily: 'inherit',
    borderRadius: '0.5rem', // rounded-lg
  },
  elements: {
    card: 'shadow-none border border-border rounded-lg',
    headerTitle: 'text-2xl font-semibold',
    headerSubtitle: 'text-sm text-muted-foreground',
    socialButtonsBlockButton:
      'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    formButtonPrimary:
      'bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm',
    formFieldInput:
      'border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    formFieldLabel: 'text-sm font-medium leading-none',
    footerActionLink: 'text-primary hover:text-primary/90 font-medium',
  },
};
