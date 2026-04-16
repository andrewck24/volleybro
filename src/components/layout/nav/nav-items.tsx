import type { Tab } from "@/components/layout/tab-container";
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

export const NAV_ITEMS: {
  tab: Tab;
  label: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}[] = [
  { tab: "home", label: "首頁", activeIcon: <RiHome5Fill />, inactiveIcon: <RiHome5Line /> },
  { tab: "team", label: "球隊", activeIcon: <RiGroupFill />, inactiveIcon: <RiGroupLine /> },
  { tab: "notifications", label: "通知", activeIcon: <RiNotification2Fill />, inactiveIcon: <RiNotification2Line /> },
  { tab: "user", label: "設定", activeIcon: <RiMenuFill />, inactiveIcon: <RiMenuLine /> },
];
