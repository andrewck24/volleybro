"use client";
import type { PullToRefreshState } from "@/hooks/use-pull-to-refresh";
import { useEffect, useRef } from "react";
import { MdOutlineSportsVolleyball } from "react-icons/md";

interface PullRefreshIndicatorProps {
  state: PullToRefreshState;
}

export function PullRefreshIndicator({ state }: PullRefreshIndicatorProps) {
  const { isPulling, isRefreshing, pullDistance, progress } = state;
  const isActive = isPulling || isRefreshing;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wasActive = wasActiveRef.current;
    wasActiveRef.current = isActive;

    if (!wasActive || isActive) return;

    wrapper.style.transition = "height 0.2s ease-out";
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "height") {
        wrapper.style.transition = "";
        wrapper.removeEventListener("transitionend", onTransitionEnd);
      }
    };
    wrapper.addEventListener("transitionend", onTransitionEnd);
    return () => wrapper.removeEventListener("transitionend", onTransitionEnd);
  }, [isActive]);

  const opacity = isRefreshing ? 1 : isPulling ? progress : 0;
  const scale = isRefreshing ? 1 : 0.6 + 0.4 * progress;
  const rotate = isRefreshing ? undefined : `${180 * progress}deg`;

  return (
    <div
      ref={wrapperRef}
      className="pull-refresh-indicator flex items-center justify-center overflow-hidden"
      data-testid="pull-refresh-wrapper"
      style={{ height: isActive ? pullDistance : 0 }}
      aria-hidden
    >
      <MdOutlineSportsVolleyball
        className={isRefreshing ? "animate-spin animate-volleyball-bounce" : ""}
        style={{
          opacity,
          scale,
          rotate,
          fontSize: "1.75rem",
          color: "var(--color-primary)",
        }}
      />
    </div>
  );
}
