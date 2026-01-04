# Clerk + Tailwind CSS v4 compatibility (this repo)

## Current setup
- Clerk styles are isolated into a CSS cascade layer by setting `appearance.cssLayerName: 'clerk'` in `ClerkProvider`.
- Tailwind is loaded from `src/styles/global.css`.

## Key files
- ClerkProvider appearance config: `src/app/[locale]/(auth)/layout.tsx`
  ```tsx
  <ClerkProvider
    appearance={{ cssLayerName: 'clerk' }}
    // ...other props
  >
    {props.children}
  </ClerkProvider>;
  ```
- Global CSS (Tailwind): `src/styles/global.css`
  ```css
  @layer theme, base, clerk, components, utilities;
  @import 'tailwindcss';
  ```

## How to use
- If you add another `ClerkProvider`, it must include:
  - `appearance: { cssLayerName: 'clerk' }`
- Customize Clerk UI via Clerk appearance props (variables/elements) in `ClerkProvider` or per component (e.g. `<SignIn appearance={...} />`).
  ```tsx
  <SignIn
    appearance={{
      elements: {
        formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
        card: 'shadow-lg',
      },
    }}
  />;
  ```

## Resources
- https://clerk.com/docs/customization/appearance
- https://tailwindcss.com/docs
