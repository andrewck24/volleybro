"use client";

import { useEffect } from "react";

import { DecisionCard } from "@/components/decision-card";
import { Accordion } from "@/components/ui/accordion";
import type { DecisionRecord } from "@/lib/decision-record";

function useScrollToDecisionAnchor() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("adr-")) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);
}

export function DecisionTimeline({
  decisions = [],
}: {
  decisions?: DecisionRecord[];
}) {
  useScrollToDecisionAnchor();

  if (decisions.length === 0) return null;

  const defaultOpen = decisions.map((record) => record.id);

  return (
    <div className="not-prose relative my-6 pl-8 before:absolute before:inset-y-3 before:left-3 before:w-px before:bg-border">
      <Accordion type="multiple" defaultValue={defaultOpen}>
        {decisions.map((record) => (
          <DecisionCard key={record.id} record={record} mode="full" />
        ))}
      </Accordion>
    </div>
  );
}
