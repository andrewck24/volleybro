"use client";

import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Decision cards and test plan cards share one shape: a collapsed summary
// line a reader scans, and details that open in place.
export function CardList({ children }: { children: ReactNode }) {
  return (
    <Accordion type="multiple" className="not-prose my-4 gap-2">
      {children}
    </Accordion>
  );
}

export function CardItem({
  value,
  id,
  summary,
  children,
  className,
}: {
  value: string;
  id?: string;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AccordionItem
      value={value}
      id={id}
      className={cn(
        "scroll-mt-20 rounded-xl border bg-card px-4 not-last:border-b",
        className,
      )}
    >
      <AccordionTrigger className="gap-3 py-3 hover:no-underline">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {summary}
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-3 pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
