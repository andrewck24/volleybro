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
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex w-full justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-160 items-end gap-1 rounded-4xl bg-background/94 p-2 shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm">
        <NavLink
          href="/home"
          active={pathname === "/home"}
          activeIcon={<RiHome5Fill />}
          inactiveIcon={<RiHome5Line />}
        />
        <NavLink
          href={defaultTeamId ? `/team/${defaultTeamId}` : "/team"}
          active={pathname.startsWith("/team")}
          activeIcon={<RiGroupFill />}
          inactiveIcon={<RiGroupLine />}
        />
        {defaultTeamId && <ActionButton teamId={defaultTeamId} />}
        <NavLink
          href="/notifications"
          active={pathname.startsWith("/notifications")}
          activeIcon={<RiNotification2Fill />}
          inactiveIcon={<RiNotification2Line />}
        />
        <NavLink
          href="/user"
          active={pathname.startsWith("/user")}
          activeIcon={<RiMenuFill />}
          inactiveIcon={<RiMenuLine />}
        />
      </div>
    </nav>
  );
};

const NavLink = ({
  href,
  active = false,
  activeIcon,
  inactiveIcon,
  className,
}: {
  href: string;
  active?: boolean;
  activeIcon?: React.ReactNode;
  inactiveIcon?: React.ReactNode;
  className?: string;
}) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-3xl pt-1",
        "text-xs text-muted-foreground no-underline [&>svg]:size-6",
        "transition-all duration-200 ease-in-out",
        active && "bg-muted/60 font-semibold text-primary",
        className,
      )}
    >
      {active ? activeIcon : inactiveIcon}
    </Link>
  );
};
