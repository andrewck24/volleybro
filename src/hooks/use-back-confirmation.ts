"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useBackConfirmation(active: boolean, onLeave: () => void) {
  const [confirming, setConfirming] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    if (!active) return;
    leaving.current = false;
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      if (leaving.current) return;
      window.history.pushState(null, "", window.location.href);
      setConfirming(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [active]);

  const confirmLeave = useCallback(() => {
    leaving.current = true;
    setConfirming(false);
    onLeave();
  }, [onLeave]);

  const cancelLeave = useCallback(() => setConfirming(false), []);

  return { confirming, confirmLeave, cancelLeave };
}
