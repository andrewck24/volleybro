"use client";
import { BottomNav } from "@/components/layout/nav/bottom-nav";
import { SideNav } from "@/components/layout/nav/side-nav";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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

export const TabContainer = ({ home, notifications, user, team }: TabContainerProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = resolveTabFromPath(pathname);
  const [tabCurrentRoute, setTabCurrentRoute] = useState<Record<Tab, string>>({
    home: "/home",
    team: "/team",
    notifications: "/notifications",
    user: "/user",
  });

  // Track each tab's last-visited route; only update the tab that just navigated.
  // Render-phase setState is intentional here: activeTab is derived from pathname,
  // and the !== guard ensures this fires at most once per pathname change.
  if (tabCurrentRoute[activeTab] !== pathname) {
    setTabCurrentRoute((prev) => ({ ...prev, [activeTab]: pathname }));
  }

  const switchTab: TabSwitchProps["onTabSwitch"] = (newTab) => {
    const direction =
      TAB_ORDER.indexOf(newTab) > TAB_ORDER.indexOf(activeTab) ? "forward" : "backward";
    document.documentElement.dataset.direction = direction;

    const navigate = () =>
      router.replace(tabCurrentRoute[newTab], { scroll: false });

    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(navigate);
    } else {
      navigate();
    }
  };

  const slots: Record<Tab, React.ReactNode> = { home, team, notifications, user };

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex flex-1 overflow-hidden">
        <SideNav activeTab={activeTab} onTabSwitch={switchTab} />
        <div className="relative flex-1 overflow-auto">
          {TAB_ORDER.map((tab) => (
            <div
              key={tab}
              className={activeTab === tab ? "block" : "hidden"}
              style={{ viewTransitionName: activeTab === tab ? "tab-content" : undefined }}
            >
              {slots[tab]}
            </div>
          ))}
        </div>
      </div>
      <BottomNav activeTab={activeTab} onTabSwitch={switchTab} />
    </div>
  );
};
