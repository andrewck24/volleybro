import type { Tab, TabSwitchProps } from "@/components/layout/tab-container";
import { cn } from "@/lib/utils";
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

const NAV_ITEMS: {
  tab: Tab;
  label: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}[] = [
  {
    tab: "home",
    label: "首頁",
    activeIcon: <RiHome5Fill />,
    inactiveIcon: <RiHome5Line />,
  },
  {
    tab: "team",
    label: "球隊",
    activeIcon: <RiGroupFill />,
    inactiveIcon: <RiGroupLine />,
  },
  {
    tab: "notifications",
    label: "通知",
    activeIcon: <RiNotification2Fill />,
    inactiveIcon: <RiNotification2Line />,
  },
  {
    tab: "user",
    label: "設定",
    activeIcon: <RiMenuFill />,
    inactiveIcon: <RiMenuLine />,
  },
];

const LEFT_TABS: Tab[] = ["home", "team"];
const RIGHT_TABS: Tab[] = ["notifications", "user"];

export const NavButtonsLeft = ({ activeTab, onTabSwitch }: TabSwitchProps) => (
  <>
    {NAV_ITEMS.filter((item) => LEFT_TABS.includes(item.tab)).map(
      ({ tab, activeIcon, inactiveIcon }) => (
        <NavButton
          key={tab}
          tab={tab}
          active={activeTab === tab}
          onTabSwitch={onTabSwitch}
          activeIcon={activeIcon}
          inactiveIcon={inactiveIcon}
        />
      ),
    )}
  </>
);

export const NavButtonsRight = ({ activeTab, onTabSwitch }: TabSwitchProps) => (
  <>
    {NAV_ITEMS.filter((item) => RIGHT_TABS.includes(item.tab)).map(
      ({ tab, activeIcon, inactiveIcon }) => (
        <NavButton
          key={tab}
          tab={tab}
          active={activeTab === tab}
          onTabSwitch={onTabSwitch}
          activeIcon={activeIcon}
          inactiveIcon={inactiveIcon}
        />
      ),
    )}
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
      "md:w-full md:flex-none md:flex-row md:rounded-xl md:pt-0",
      active && "bg-muted/60 font-semibold text-primary",
      className,
    )}
  >
    {active ? activeIcon : inactiveIcon}
  </button>
);
