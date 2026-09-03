"use client";
import { useSyncExternalStore } from "react";

// Module scope: a new reference each render would re-subscribe each render.
const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

const getSnapshot = () => navigator.onLine;

// Client components still render on the server, where there is no navigator.
const getServerSnapshot = () => true;

/**
 * Only the `false` answer is trustworthy: a captive portal or a dead upstream
 * both report `true`. Never let this decide queue state.
 */
export const useIsOnline = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
