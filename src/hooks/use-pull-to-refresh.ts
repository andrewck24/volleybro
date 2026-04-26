"use client";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export interface PullToRefreshOptions {
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  pwaOnly?: boolean;
}

export interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  progress: number;
}

function appr(dy: number, max: number, k: number): number {
  return max * (1 - Math.exp((-k * dy) / max));
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * A ref-scoped, PWA-aware pull-to-refresh hook.
 *
 * Contract:
 * - The hook owns `transform` on the passed ref element. Consumers MUST NOT set
 *   `transform` on that element — direct DOM mutation is used for perf.
 * - Listeners are bound to the passed ref element, never to `window` or `document`,
 *   so multiple tab instances do not cross-fire.
 * - The hook activates only in PWA standalone mode
 *   (`matchMedia("(display-mode: standalone)")` or iOS `navigator.standalone`).
 *   In non-standalone contexts it returns zero-state and registers no listeners.
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<unknown> | unknown,
  options?: PullToRefreshOptions,
): PullToRefreshState {
  const {
    threshold = 80,
    maxPull = 128,
    resistance = 0.4,
    pwaOnly = true,
  } = options ?? {};

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    progress: 0,
  });

  const isRefreshingRef = useRef(false);
  const startYRef = useRef(0);

  const resetElement = useCallback(
    (el: HTMLElement, animate: boolean) => {
      if (animate) {
        el.style.transition = "transform 0.2s ease-out";
        const onTransitionEnd = (e: TransitionEvent) => {
          if (e.propertyName === "transform") {
            el.style.transition = "";
            el.removeEventListener("transitionend", onTransitionEnd);
          }
        };
        el.addEventListener("transitionend", onTransitionEnd);
      }
      el.style.transform = "translateY(0)";
    },
    [],
  );

  useEffect(() => {
    if (pwaOnly && !isStandalone()) return;

    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      startYRef.current = e.touches[0].clientY;

      const onTouchMove = (ev: TouchEvent) => {
        const dy = ev.touches[0].clientY - startYRef.current;
        if (dy <= 0) return;

        const damped = appr(dy, maxPull, resistance);
        el.style.transition = "";
        el.style.transform = `translateY(${damped}px)`;

        const progress = Math.min(damped / threshold, 1);
        setState({
          isPulling: true,
          isRefreshing: false,
          pullDistance: damped,
          progress,
        });
      };

      const onTouchEnd = async () => {
        const currentDy =
          parseFloat(el.style.transform.replace("translateY(", "")) || 0;

        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("touchend", onTouchEnd);
        el.removeEventListener("touchcancel", onTouchCancel);

        if (currentDy >= threshold && !isRefreshingRef.current) {
          isRefreshingRef.current = true;
          setState({
            isPulling: false,
            isRefreshing: true,
            pullDistance: currentDy,
            progress: 1,
          });
          resetElement(el, true);
          try {
            await onRefresh();
          } finally {
            isRefreshingRef.current = false;
            setState({
              isPulling: false,
              isRefreshing: false,
              pullDistance: 0,
              progress: 0,
            });
          }
        } else {
          resetElement(el, true);
          setState({
            isPulling: false,
            isRefreshing: false,
            pullDistance: 0,
            progress: 0,
          });
        }
      };

      const onTouchCancel = () => {
        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("touchend", onTouchEnd);
        el.removeEventListener("touchcancel", onTouchCancel);
        el.style.transition = "";
        resetElement(el, false);
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          progress: 0,
        });
      };

      el.addEventListener("touchmove", onTouchMove, { passive: true });
      el.addEventListener("touchend", onTouchEnd);
      el.addEventListener("touchcancel", onTouchCancel);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
    };
  }, [ref, onRefresh, threshold, maxPull, resistance, pwaOnly, resetElement]);

  return state;
}
