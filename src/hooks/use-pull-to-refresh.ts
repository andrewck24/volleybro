"use client";
import { isStandalone } from "@/lib/pwa";
import { RefObject, useEffect, useRef, useState } from "react";

export class RefreshTimeoutError extends Error {
  constructor() {
    super("refresh timeout");
    this.name = "RefreshTimeoutError";
  }
}

export interface PullToRefreshOptions {
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  pwaOnly?: boolean;
  minRefreshDisplay?: number;
  refreshTimeout?: number;
  onError?: (error: unknown) => void;
}

export interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  progress: number;
  refreshError: unknown | null;
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
 * - `minRefreshDisplay`: Minimum milliseconds `isRefreshing` stays `true` after
 *   `onRefresh` is invoked. Timer and callback run concurrently; total wait is
 *   `max(onRefresh duration, minRefreshDisplay)`. Default: 1000.
 * - `refreshTimeout`: Milliseconds before the refresh is abandoned and `onError`
 *   is called with `RefreshTimeoutError`. Default: 8000.
 * - `onError`: Called when refresh rejects or times out. Use
 *   `error instanceof RefreshTimeoutError` to detect timeouts.
 * - `refreshError`: The error from the most recent failed refresh; `null` after a
 *   successful refresh or when a new gesture begins.
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
    minRefreshDisplay = 1000,
    refreshTimeout = 8000,
  } = options ?? {};

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    progress: 0,
    refreshError: null,
  });

  const isRefreshingRef = useRef(false);
  const startYRef = useRef(0);
  const dampedRef = useRef(0);
  const gestureCleanupRef = useRef<(() => void) | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;

  useEffect(() => {
    if (pwaOnly && !isStandalone()) return;

    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      startYRef.current = e.touches[0].clientY;
      dampedRef.current = 0;
      setState((s) => ({ ...s, refreshError: null }));

      const onTouchMove = (ev: TouchEvent) => {
        const dy = ev.touches[0].clientY - startYRef.current;
        if (dy <= 0) return;

        const damped = appr(dy, maxPull, resistance);
        dampedRef.current = damped;

        const progress = Math.min(damped / threshold, 1);
        setState((s) => ({
          ...s,
          isPulling: true,
          isRefreshing: false,
          pullDistance: damped,
          progress,
        }));
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
          setState((s) => ({
            ...s,
            isPulling: false,
            isRefreshing: true,
            pullDistance: currentDy,
            progress: 1,
          }));

          let minDisplayId: ReturnType<typeof setTimeout> | undefined;
          let timeoutId: ReturnType<typeof setTimeout> | undefined;

          const minDisplayTimer = new Promise<void>((r) => {
            minDisplayId = setTimeout(r, minRefreshDisplay);
          });
          const timeoutTimer = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new RefreshTimeoutError()),
              refreshTimeout,
            );
          });

          try {
            await Promise.race([
              Promise.all([onRefreshRef.current(), minDisplayTimer]),
              timeoutTimer,
            ]);
          } catch (error) {
            onErrorRef.current?.(error);
            setState((s) => ({ ...s, refreshError: error }));
          } finally {
            clearTimeout(minDisplayId);
            clearTimeout(timeoutId);
            isRefreshingRef.current = false;
            setState((s) => ({
              ...s,
              isPulling: false,
              isRefreshing: false,
              pullDistance: 0,
              progress: 0,
            }));
          }
        } else {
          setState((s) => ({
            ...s,
            isPulling: false,
            isRefreshing: false,
            pullDistance: 0,
            progress: 0,
          }));
        }
      };

      const onTouchCancel = () => {
        cleanup();
        setState((s) => ({
          ...s,
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          progress: 0,
        }));
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
  }, [
    ref,
    threshold,
    maxPull,
    resistance,
    pwaOnly,
    minRefreshDisplay,
    refreshTimeout,
  ]);

  return state;
}
