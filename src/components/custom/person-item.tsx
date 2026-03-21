"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FiUser } from "react-icons/fi";

import { cn } from "@/lib/utils";

interface PersonItemProps {
  name: string;
  image?: string;
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PersonItem({
  name,
  image,
  href,
  onClick,
  children,
  action,
  className,
}: PersonItemProps) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current opacity-50">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <FiUser className="h-4 w-4" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-medium">{name}</span>
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
