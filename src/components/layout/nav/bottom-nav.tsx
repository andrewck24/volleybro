"use client";
import { ActionButton } from "@/components/layout/nav/action-button";
import { NavLinksLeft, NavLinksRight } from "@/components/layout/nav/links";
import { useActiveTeamId } from "@/hooks/use-data";
import type { TabSwitchProps } from "@/components/layout/tab-container";

export const BottomNav = ({ activeTab, onTabSwitch }: TabSwitchProps) => {
  const { teamId } = useActiveTeamId();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex w-full justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-160 items-end gap-1 rounded-4xl bg-background/94 p-2 shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm">
        <NavLinksLeft activeTab={activeTab} onTabSwitch={onTabSwitch} />
        {teamId && <ActionButton teamId={teamId} />}
        <NavLinksRight activeTab={activeTab} onTabSwitch={onTabSwitch} />
      </div>
    </nav>
  );
};
