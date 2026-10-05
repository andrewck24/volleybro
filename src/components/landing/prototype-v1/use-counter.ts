import { useEffect } from "react";

// PROTOTYPE (throwaway): commit counter per component, read from the console
// as window.__demoRenders to check which side re-renders.
export const useCounter = (name: string) => {
  useEffect(() => {
    const w = window as unknown as { __demoRenders?: Record<string, number> };
    const c = (w.__demoRenders ??= {});
    c[name] = (c[name] ?? 0) + 1;
  });
};
