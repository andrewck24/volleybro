"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RiGroupLine } from "react-icons/ri";

import { useTeam } from "@/hooks/use-data";
import { cn } from "@/lib/utils";

interface TeamItemProps {
  teamId: string;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function TeamItem({
  teamId,
  href,
  onClick,
  children,
  action,
  className,
}: TeamItemProps) {
  const { team, isLoading } = useTeam(teamId);

  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current opacity-50">
        <RiGroupLine className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isLoading ? (
          <div
            data-testid="team-name-skeleton"
            className="h-4 w-24 animate-pulse rounded bg-muted"
          />
        ) : (
          <span className="truncate font-medium">{team?.name}</span>
        )}
        {children}
      </div>
      {action && (
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          role="presentation"
        >
          {action}
        </div>
      )}
    </>
  );

  const baseClassName = cn(
    "flex h-12 w-full items-center gap-3 rounded-md px-3",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cn(baseClassName, "hover:bg-accent")}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClassName, "hover:bg-accent text-left")}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
