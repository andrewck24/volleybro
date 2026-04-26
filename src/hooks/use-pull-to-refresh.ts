"use client";
import { isStandalone } from "@/lib/pwa";
import { RefObject, useEffect, useRef, useState } from "react";

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

/**
 * A ref-scoped, PWA-aware pull-to-refresh hook.
 *
 * Contract:
 * - The hook owns no DOM mutation. Consumers render `<PullRefreshIndicator />`
 *   to visualize state — the indicator reads `pullDistance` and applies it to
 *   its own wrapper element's `height`.
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
  const dampedRef = useRef(0);
  const gestureCleanupRef = useRef<(() => void) | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (pwaOnly && !isStandalone()) return;

    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      startYRef.current = e.touches[0].clientY;
      dampedRef.current = 0;

      const onTouchMove = (ev: TouchEvent) => {
        const dy = ev.touches[0].clientY - startYRef.current;
        if (dy <= 0) return;

        const damped = appr(dy, maxPull, resistance);
        dampedRef.current = damped;

        const progress = Math.min(damped / threshold, 1);
        setState({
          isPulling: true,
          isRefreshing: false,
          pullDistance: damped,
          progress,
        });
      };

      const cleanup = () => {
        el.removeEventListener("touchmove", onTouchMove);
        el.removeEventListener("touchend", onTouchEnd);
        el.removeEventListener("touchcancel", onTouchCancel);
        gestureCleanupRef.current = null;
      };

      const onTouchEnd = async () => {
        const currentDy = dampedRef.current;
        cleanup();

        if (currentDy >= threshold && !isRefreshingRef.current) {
          isRefreshingRef.current = true;
          setState({
            isPulling: false,
            isRefreshing: true,
            pullDistance: currentDy,
            progress: 1,
          });
          try {
            await onRefreshRef.current();
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
          setState({
            isPulling: false,
            isRefreshing: false,
            pullDistance: 0,
            progress: 0,
          });
        }
      };

      const onTouchCancel = () => {
        cleanup();
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
      gestureCleanupRef.current = cleanup;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      gestureCleanupRef.current?.();
    };
  }, [ref, threshold, maxPull, resistance, pwaOnly]);

  return state;
}
