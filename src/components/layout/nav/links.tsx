"use client";
import { ActionButton } from "@/components/layout/nav/action-button";
import { useActiveTeamId } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export const NavLinks = (_props: { session?: unknown }) => {
  const pathname = usePathname();
  const { teamId: defaultTeamId } = useActiveTeamId();

  return (
    <nav className="fixed bottom-0 left-0 flex w-full flex-row items-center justify-center bg-card pb-[calc(env(safe-area-inset-bottom)-1rem)]">
      <NavLink
        href="/home"
        active={pathname === "/home"}
        activeIcon={<RiHome5Fill />}
        inactiveIcon={<RiHome5Line />}
      >
        首頁
      </NavLink>
      <NavLink
        href={defaultTeamId ? `/team/${defaultTeamId}` : "/team"}
        active={pathname.startsWith("/team")}
        activeIcon={<RiGroupFill />}
        inactiveIcon={<RiGroupLine />}
      >
        隊伍
      </NavLink>
      {defaultTeamId && <ActionButton teamId={defaultTeamId} />}
      <NavLink
        href="/notifications"
        active={pathname.startsWith("/notifications")}
        activeIcon={<RiNotification2Fill />}
        inactiveIcon={<RiNotification2Line />}
      >
        通知
      </NavLink>
      <NavLink
        href="/user"
        active={pathname.startsWith("/user")}
        activeIcon={<RiMenuFill />}
        inactiveIcon={<RiMenuLine />}
      >
        選項
      </NavLink>
    </nav>
  );
};

const NavLink = ({
  href,
  active = false,
  activeIcon,
  inactiveIcon,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  activeIcon?: React.ReactNode;
  inactiveIcon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full flex-1 flex-col items-center justify-center pt-2",
        "text-xs text-foreground no-underline [&>svg]:size-7",
        "transition-all duration-200 ease-in-out",
        active && "border-t-4 border-primary pt-1 font-semibold text-primary",
        className,
      )}
    >
      {active ? activeIcon : inactiveIcon}
      {children}
    </Link>
  );
};
