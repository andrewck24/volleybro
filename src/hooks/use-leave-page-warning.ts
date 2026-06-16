"use client";

import { useEffect, useRef } from "react";

const suppressors = new Set<() => void>();

export function suppressLeaveWarning(): void {
  suppressors.forEach((fn) => fn());
}

export function useLeavePageWarning(isDirty: boolean): void {
  const suppressRef = useRef(false);

  useEffect(() => {
    const suppress = () => {
      suppressRef.current = true;
    };
    suppressors.add(suppress);
    return () => {
      suppressors.delete(suppress);
    };
  }, []);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (suppressRef.current) {
        suppressRef.current = false;
        return;
      }
      e.preventDefault();
      e.returnValue = ""; // required for cross-browser compatibility
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
