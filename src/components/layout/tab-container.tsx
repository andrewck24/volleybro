"use client";
import { NavigationBar } from "@/components/layout/nav";
import { useActiveTeamId } from "@/hooks/use-data";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export type Tab = "home" | "team" | "notifications" | "user";

const TAB_ORDER: Tab[] = ["home", "team", "notifications", "user"];

function resolveTabFromPath(path: string): Tab {
  if (path.startsWith("/team")) return "team";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/user")) return "user";
  return "home";
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
  const activeTab = resolveTabFromPath(pathname);
  const { teamId } = useActiveTeamId();
  const tabCurrentRoute = useRef<Record<Tab, string>>({
    home: "/home",
    team: "/team",
    notifications: "/notifications",
    user: "/user",
  });
  const scrollPositions = useRef<Record<Tab, number>>({
    home: 0,
    team: 0,
    notifications: 0,
    user: 0,
  });
  const pendingRestoreTab = useRef<Tab | null>(null);

  useEffect(() => {
    if (teamId && tabCurrentRoute.current["team"] === "/team") {
      tabCurrentRoute.current["team"] = `/team/${teamId}`;
    }
  }, [teamId]);

  useEffect(() => {
    tabCurrentRoute.current[activeTab] = pathname;
    if (pendingRestoreTab.current !== activeTab) return;
    const targetY = scrollPositions.current[activeTab];
    pendingRestoreTab.current = null;
    // double-rAF: router.replace({ scroll: false }) needs two frames for DOM layout to settle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "auto" });
      });
    });
  }, [activeTab, pathname]);

  const switchTab: TabSwitchProps["onTabSwitch"] = useCallback(
    (newTab) => {
      if (newTab === activeTab) return;
      scrollPositions.current[activeTab] = window.scrollY;
      pendingRestoreTab.current = newTab;

      const direction =
        TAB_ORDER.indexOf(newTab) > TAB_ORDER.indexOf(activeTab)
          ? "forward"
          : "backward";
      document.documentElement.dataset.direction = direction;

      const route = tabCurrentRoute.current[newTab];
      const navigate = () => router.replace(route, { scroll: false });

      if (typeof document.startViewTransition === "function") {
        document.startViewTransition(navigate);
      } else {
        navigate();
      }
    },
    [activeTab, router],
  );

  const slots: Record<Tab, React.ReactNode> = {
    home,
    team,
    notifications,
    user,
  };

  return (
    <div className="flex min-h-dvh flex-col items-center pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <div className="relative w-full max-w-196 pt-12 pb-20 md:pb-2 md:pl-15">
        {TAB_ORDER.map((tab) => (
          <div
            key={tab}
            className={activeTab === tab ? "block" : "hidden"}
            style={{
              viewTransitionName: activeTab === tab ? "tab-content" : undefined,
            }}
          >
            {slots[tab]}
          </div>
        ))}
      </div>
      <NavigationBar activeTab={activeTab} onTabSwitch={switchTab} />
    </div>
  );
};
