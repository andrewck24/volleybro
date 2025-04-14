"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  RiHome5Line,
  RiHome5Fill,
  RiGroupLine,
  RiGroupFill,
  RiNotification2Line,
  RiNotification2Fill,
  RiMenuLine,
  RiMenuFill,
} from "react-icons/ri";
import { ActionButton } from "@/components/layout/nav/action-button";

export const NavLinks = ({ session }) => {
  const pathname = usePathname();
  const defaultTeamId: string = session?.user?.teams?.joined[0];

  return (
    <nav className="fixed bottom-0 left-0 flex flex-row items-center justify-center w-full pb-[calc(env(safe-area-inset-bottom)-1rem)] bg-card">
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
      <ActionButton teamId={defaultTeamId} />
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
        "flex flex-col items-center justify-center flex-1 h-full pt-2",
        "no-underline text-foreground [&>svg]:size-7 text-xs",
        "transition-all duration-200 ease-in-out",
        active && "pt-1 font-semibold border-t-4 border-primary text-primary",
        className
      )}
    >
      {active ? activeIcon : inactiveIcon}
      {children}
    </Link>
  );
};
