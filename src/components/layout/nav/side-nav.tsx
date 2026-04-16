"use client";
import { NAV_ITEMS } from "@/components/layout/nav/nav-items";
import { cn } from "@/lib/utils";
import type { TabSwitchProps } from "@/components/layout/tab-container";
import { useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

const STORAGE_KEY = "sidenav-collapsed";

export const SideNav = ({ activeTab, onTabSwitch }: TabSwitchProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const toggle = () => {
    const next = !collapsed;
    localStorage.setItem(STORAGE_KEY, String(next));
    setCollapsed(next);
  };

  return (
    <nav
      className={cn(
        "hidden md:flex flex-col gap-1 p-2 border-r bg-background/94 backdrop-blur-sm",
        "transition-[width] duration-300 overflow-hidden shrink-0",
        collapsed ? "w-13" : "w-50",
      )}
    >
      {NAV_ITEMS.map(({ tab, label, activeIcon, inactiveIcon }) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabSwitch(tab)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-2 h-11 w-full",
              "text-sm text-muted-foreground transition-all duration-200 [&>svg]:size-6 [&>svg]:shrink-0",
              active && "bg-muted/60 font-semibold text-primary",
            )}
          >
            {active ? activeIcon : inactiveIcon}
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        );
      })}

      <button
        onClick={toggle}
        aria-label={collapsed ? "展開側邊欄" : "收合側邊欄"}
        className="mt-auto flex items-center justify-center h-9 w-full rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 [&>svg]:size-5"
      >
        {collapsed ? <RiArrowRightSLine /> : <RiArrowLeftSLine />}
      </button>
    </nav>
  );
};
