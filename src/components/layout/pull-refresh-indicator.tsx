import type { PullToRefreshState } from "@/hooks/use-pull-to-refresh";
import { MdOutlineSportsVolleyball } from "react-icons/md";

interface PullRefreshIndicatorProps {
  state: PullToRefreshState;
}

export function PullRefreshIndicator({ state }: PullRefreshIndicatorProps) {
  const { isPulling, isRefreshing, progress } = state;

  const opacity = isRefreshing ? 1 : isPulling ? progress : 0;
  const scale = isRefreshing ? 1 : 0.6 + 0.4 * progress;
  const rotate = isRefreshing ? undefined : `${180 * progress}deg`;

  return (
    <div
      className="pull-refresh-indicator absolute left-0 right-0 top-2 z-50 flex items-center justify-center"
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
