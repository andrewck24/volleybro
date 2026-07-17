"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

const Separator = ({
  className,
  orientation = "horizontal",
  decorative = true,
  content = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  content?: string;
}) => (
  <div
    data-slot="Separator"
    className={cn(
      "flex basis-[1.25rem] items-center justify-center",
      orientation === "horizontal" ? "flex-row" : "flex-col",
    )}
  >
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "flex-1 shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px]" : "w-[1px]",
        className,
      )}
      {...props}
    />
    {content && (
      <>
        <span className="px-2 text-sm text-muted">{content}</span>
        <SeparatorPrimitive.Root
          decorative={decorative}
          orientation={orientation}
          className={cn(
            "flex-1 shrink-0 bg-border",
            orientation === "horizontal" ? "h-[1px]" : "w-[1px]",
            className,
          )}
          {...props}
        />
      </>
    )}
  </div>
);

export { Separator };
