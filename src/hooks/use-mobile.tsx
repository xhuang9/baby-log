import * as React from 'react';

const MOBILE_BREAKPOINT = 992; // lg

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    mql.addEventListener('change', onChange);
    const rafId = requestAnimationFrame(() => {
      setIsMobile(mql.matches);
    });
    return () => {
      cancelAnimationFrame(rafId);
      mql.removeEventListener('change', onChange);
    };
  }, []);

  return !!isMobile;
}
