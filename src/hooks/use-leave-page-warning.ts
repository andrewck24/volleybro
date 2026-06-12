"use client";

import { useEffect } from "react";

let suppressNextWarning = false;

export function suppressLeaveWarning(): void {
  suppressNextWarning = true;
}

export function useLeavePageWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (suppressNextWarning) {
        suppressNextWarning = false;
        return;
      }
      e.preventDefault();
      e.returnValue = ""; // required for cross-browser compatibility
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
