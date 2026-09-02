"use client";
import { useSyncExternalStore } from "react";

// Module scope so the reference never changes: a subscribe defined inside the
// component would be a new function every render, and React would tear the
// listeners down and put them back each time.
const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

const getSnapshot = () => navigator.onLine;

// Next.js renders client components on the server too, where there is no
// navigator at all. Assumed online because nothing is queued during a server
// render, so the value cannot be displayed from one.
const getServerSnapshot = () => true;

/**
 * Whether the device is attached to a network. Only the `false` answer is
 * trustworthy -- a device on a captive portal, or on wifi whose upstream is
 * down, reports `true` while nothing reaches the server. So this never decides
 * what state the queue is in; it only picks which of two true sentences to say
 * about a queue already known, from measured failures, not to be sending.
 */
export const useIsOnline = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
