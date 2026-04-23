"use client";
import { useRefreshState } from "@/lib/hooks/usePullToRefresh";

export const Main = ({ children }: { children: React.ReactNode }) => {
  const { isRefreshing, isPulling } = useRefreshState();

  return (
    <main
      style={{
        paddingTop: `calc(env(safe-area-inset-top) + 3.25rem)`,
        paddingRight: `calc(env(safe-area-inset-right) + 0.5rem)`,
        paddingLeft: `calc(env(safe-area-inset-left) + 0.5rem)`,
      }}
    >
      <div
        className={`-pb-2 flex items-center justify-center transition-all duration-300 ${
          isPulling || isRefreshing ? "h-12 opacity-100" : "h-0 opacity-0"
        }`}
      >
        <div
          className={`size-6 rounded-full border-2 border-primary border-t-transparent ${
            isRefreshing ? "animate-spin" : ""
          }`}
        />
      </div>
      <div className="mx-auto flex h-fit w-full max-w-160 flex-col gap-1 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
        {children}
      </div>
    </main>
  );
};
