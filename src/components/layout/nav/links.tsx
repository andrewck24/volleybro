"use client";
import { cn } from "@/lib/utils";
import type { Tab, TabSwitchProps } from "@/components/layout/tab-container";
import {
  RiGroupFill,
  RiGroupLine,
  RiHome5Fill,
  RiHome5Line,
  RiMenuFill,
  RiMenuLine,
  RiNotification2Fill,
  RiNotification2Line,
} from "react-icons/ri";

export const NavLinksLeft = ({ activeTab, onTabSwitch }: TabSwitchProps) => (
  <>
    <NavButton tab="home" active={activeTab === "home"} onTabSwitch={onTabSwitch} activeIcon={<RiHome5Fill />} inactiveIcon={<RiHome5Line />} />
    <NavButton tab="team" active={activeTab === "team"} onTabSwitch={onTabSwitch} activeIcon={<RiGroupFill />} inactiveIcon={<RiGroupLine />} />
  </>
);

export const NavLinksRight = ({ activeTab, onTabSwitch }: TabSwitchProps) => (
  <>
    <NavButton tab="notifications" active={activeTab === "notifications"} onTabSwitch={onTabSwitch} activeIcon={<RiNotification2Fill />} inactiveIcon={<RiNotification2Line />} />
    <NavButton tab="user" active={activeTab === "user"} onTabSwitch={onTabSwitch} activeIcon={<RiMenuFill />} inactiveIcon={<RiMenuLine />} />
  </>
);

const NavButton = ({
  tab,
  active,
  onTabSwitch,
  activeIcon,
  inactiveIcon,
  className,
}: {
  tab: Tab;
  active: boolean;
  onTabSwitch: (tab: Tab) => void;
  activeIcon?: React.ReactNode;
  inactiveIcon?: React.ReactNode;
  className?: string;
}) => (
  <button
    onClick={() => onTabSwitch(tab)}
    className={cn(
      "flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-3xl pt-1",
      "text-xs text-muted-foreground no-underline [&>svg]:size-6",
      "transition-all duration-200 ease-in-out",
      active && "bg-muted/60 font-semibold text-primary",
      className,
    )}
  >
    {active ? activeIcon : inactiveIcon}
  </button>
);
