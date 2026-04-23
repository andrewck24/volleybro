"use client";
import { NavigationBar } from "@/components/layout/nav";
import { useActiveTeamId } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type Tab = "home" | "team" | "notifications" | "user";

const TAB_ORDER: Tab[] = ["home", "team", "notifications", "user"];

function resolveTabFromPath(path: string): Tab {
  if (path.startsWith("/team")) return "team";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/user")) return "user";
  return "home";
}

function getTabRoot(tab: Tab, teamId?: string): string {
  return tab === "team" && teamId ? `/team/${teamId}` : `/${tab}`;
}

export type TabContainerProps = {
  home: React.ReactNode;
  notifications: React.ReactNode;
  user: React.ReactNode;
  team: React.ReactNode;
};

export type TabSwitchProps = {
  activeTab: Tab;
  onTabSwitch: (tab: Tab) => void;
};

export const TabContainer = ({
  home,
  notifications,
  user,
  team,
}: TabContainerProps) => {
  const pathname = usePathname();
  const router = useRouter();
  // pendingTab: set synchronously inside startViewTransition callback so the DOM
  // updates within the transition frame (URL update is async and arrives too late).
  // Cleared only after both the animation ends and pathname confirms the new tab,
  // preventing a brief activeTab revert if either condition lags.
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const activeTab = pendingTab ?? resolveTabFromPath(pathname);
  const { teamId } = useActiveTeamId();
  const tabCurrentRoute = useRef<Record<Tab, string>>({
    home: "/home",
    team: "/team",
    notifications: "/notifications",
    user: "/user",
  });
  // scrollPositions: keyed by pathname so parent/child routes store independently.
  // prevPathRef: previous pathname, used in the sub-path branch of useEffect([pathname]).
  const scrollPositions = useRef<Record<string, number>>({});
  const prevPathRef = useRef<string>(pathname);
  // transitionTargetTabRef: the tab we're transitioning to; null when no transition is in flight.
  // currentPathTabRef: latest pathname-derived tab, readable inside transition.finished closure.
  const transitionTargetTabRef = useRef<Tab | null>(null);
  const currentPathTabRef = useRef<Tab | null>(null);
  const pendingScrollRestoreRef = useRef<{ path: string; y: number } | null>(
    null,
  );

  const clearPendingTab = (targetTab: Tab) => {
    transitionTargetTabRef.current = null;
    // rAF defers the state update past the transition paint frame, avoiding a flash
    // where pendingTab clears before the new pseudo-element snapshot is composited.
    requestAnimationFrame(() => {
      setPendingTab((prev) => (prev === targetTab ? null : prev));
    });
  };

  useEffect(() => {
    if (teamId && tabCurrentRoute.current["team"] === "/team") {
      tabCurrentRoute.current["team"] = getTabRoot("team", teamId);
    }
  }, [teamId]);

  useEffect(() => {
    const prev = prevPathRef.current;
    const tab = resolveTabFromPath(pathname);
    tabCurrentRoute.current[tab] = pathname;
    currentPathTabRef.current = tab;

    if (pendingScrollRestoreRef.current?.path === pathname) {
      window.scrollTo({
        top: pendingScrollRestoreRef.current.y,
        behavior: "instant",
      });
      pendingScrollRestoreRef.current = null;
    }

    // pathname arrived at target after transition already finished
    if (transitionTargetTabRef.current === tab) clearPendingTab(tab);

    if (prev === pathname) return;
    prevPathRef.current = pathname;
    // Tab switches are handled synchronously in switchTab; skip here.
    if (resolveTabFromPath(prev) !== tab) return;
    scrollPositions.current[prev] = window.scrollY;
    window.scrollTo({
      top: scrollPositions.current[pathname] ?? 0,
      behavior: "instant",
    });
  }, [pathname]);

  const switchTab: TabSwitchProps["onTabSwitch"] = useCallback(
    (newTab) => {
      // Tap active tab: reset tab to root and scroll to top.
      if (newTab === activeTab) {
        const root = getTabRoot(newTab, teamId);
        for (const key of Object.keys(scrollPositions.current)) {
          if (resolveTabFromPath(key) === newTab)
            delete scrollPositions.current[key];
        }
        tabCurrentRoute.current[newTab] = root;

        if (pathname === root) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          router.replace(root, { scroll: false });
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        return;
      }

      scrollPositions.current[pathname] = window.scrollY;

      const direction =
        TAB_ORDER.indexOf(newTab) > TAB_ORDER.indexOf(activeTab)
          ? "forward"
          : "backward";
      document.documentElement.dataset.direction = direction;

      const route = tabCurrentRoute.current[newTab];
      const targetY = scrollPositions.current[route] ?? 0;

      if (typeof document.startViewTransition === "function") {
        pendingScrollRestoreRef.current = null;
        transitionTargetTabRef.current = newTab;
        const transition = document.startViewTransition(() => {
          flushSync(() => setPendingTab(newTab));
          window.scrollTo({ top: targetY, behavior: "instant" });
          return router.replace(route, { scroll: false });
        });
        transition.finished.then(() => {
          const targetTab = transitionTargetTabRef.current;
          if (targetTab && currentPathTabRef.current === targetTab) {
            clearPendingTab(targetTab);
          }
        });
      } else {
        pendingScrollRestoreRef.current = { path: route, y: targetY };
        router.replace(route, { scroll: false });
      }
    },
    [activeTab, pathname, router, teamId],
  );

  const slots: Record<Tab, React.ReactNode> = {
    home,
    team,
    notifications,
    user,
  };

  return (
    <>
      <div className="mx-auto w-full max-w-196">
        {TAB_ORDER.map((tab) => (
          <div
            key={tab}
            className={cn(
              "min-h-dvh bg-accent pt-[calc(env(safe-area-inset-top)+3rem)] pr-[env(safe-area-inset-right)] pb-[calc(env(safe-area-inset-bottom)+5rem)] pl-[env(safe-area-inset-left)]",
              "md:min-h-auto md:pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pl-[calc(env(safe-area-inset-left)+4rem)]",
              activeTab === tab ? "block" : "hidden",
            )}
            style={{
              viewTransitionName: activeTab === tab ? "tab-content" : undefined,
            }}
          >
            {slots[tab]}
          </div>
        ))}
      </div>
      <NavigationBar activeTab={activeTab} onTabSwitch={switchTab} />
    </>
  );
};
