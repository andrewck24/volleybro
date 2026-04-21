"use client";

import { ActionButton } from "@/components/layout/nav/action-button";
import { NavButtonsLeft, NavButtonsRight } from "@/components/layout/nav/items";
import type { TabSwitchProps } from "@/components/layout/tab-container";
import { useActiveTeamId } from "@/hooks/use-data";

const ACTION_BUTTON_CN = "-mt-5 md:mt-0 md:w-full md:rounded-xl";

export const NavigationBar = ({ activeTab, onTabSwitch }: TabSwitchProps) => {
  const { teamId } = useActiveTeamId();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex w-full justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] [view-transition-name:bottom-nav] md:pointer-events-auto md:inset-x-auto md:top-0 md:bottom-auto md:left-0 md:h-dvh md:w-16 md:flex-col md:justify-start md:px-0 md:pb-0">
      <div className="pointer-events-auto mx-auto flex w-full max-w-160 items-end gap-1 rounded-4xl bg-background/94 p-2 shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm md:mx-0 md:h-full md:max-w-none md:flex-col md:items-stretch md:justify-center md:rounded-none md:border-r md:p-1 md:shadow-none md:ring-0">
        <NavButtonsLeft activeTab={activeTab} onTabSwitch={onTabSwitch} />
        <ActionButton teamId={teamId} className={ACTION_BUTTON_CN} />
        <NavButtonsRight activeTab={activeTab} onTabSwitch={onTabSwitch} />
      </div>
    </nav>
  );
};
