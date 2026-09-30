import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useMobileViewport() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Keep the viewport unknown until hydration has measured it. Treating it as
  // desktop during the first render can trigger a desktop-only redirect on phones.
  return isMobile;
}

export function useIsMobile() {
  return !!useMobileViewport();
}
