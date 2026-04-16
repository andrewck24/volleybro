"use client";
import { NAV_ITEMS } from "@/components/layout/nav/nav-items";
import { cn } from "@/lib/utils";
import type { Tab, TabSwitchProps } from "@/components/layout/tab-container";

const LEFT_TABS: Tab[] = ["home", "team"];
const RIGHT_TABS: Tab[] = ["notifications", "user"];

export const NavLinksLeft = ({ activeTab, onTabSwitch }: TabSwitchProps) => (
  <>
    {NAV_ITEMS.filter((item) => LEFT_TABS.includes(item.tab)).map(({ tab, activeIcon, inactiveIcon }) => (
      <NavButton key={tab} tab={tab} active={activeTab === tab} onTabSwitch={onTabSwitch} activeIcon={activeIcon} inactiveIcon={inactiveIcon} />
    ))}
  </>
);

export const NavLinksRight = ({ activeTab, onTabSwitch }: TabSwitchProps) => (
  <>
    {NAV_ITEMS.filter((item) => RIGHT_TABS.includes(item.tab)).map(({ tab, activeIcon, inactiveIcon }) => (
      <NavButton key={tab} tab={tab} active={activeTab === tab} onTabSwitch={onTabSwitch} activeIcon={activeIcon} inactiveIcon={inactiveIcon} />
    ))}
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
