"use client";

import { useEffect } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  parseDecisionRecord,
  type DecisionRecord,
} from "@/lib/decision-record";

type DecisionEntry =
  | { ok: true; record: DecisionRecord }
  | { ok: false; key: string; message: string };

// One bad record must not blank the whole timeline, so each is parsed on its
// own and a failure becomes an entry instead of a throw.
function parseEntry(decision: unknown, index: number): DecisionEntry {
  try {
    return {
      ok: true,
      record: parseDecisionRecord(decision),
    };
  } catch (error) {
    return {
      ok: false,
      key: `invalid-${index}`,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// The browser jumps to #adr-<id> before hydration opens the accordion and
// shifts the page, so the jump lands short; repeat it once rendered.
function useScrollToDecisionAnchor() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("adr-")) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);
}

export function DecisionTimeline({ decisions }: { decisions?: unknown[] }) {
  useScrollToDecisionAnchor();
  const entries = (decisions ?? []).map((decision, index) =>
    parseEntry(decision, index),
  );

  if (entries.length === 0) return null;

  const defaultOpen = entries
    .filter((entry): entry is Extract<DecisionEntry, { ok: true }> => entry.ok)
    .map((entry) => entry.record.id);

  return (
    <div className="not-prose relative my-6 pl-8 before:absolute before:inset-y-3 before:left-3 before:w-px before:bg-border">
      <Accordion type="multiple" defaultValue={defaultOpen}>
        {entries.map((entry) => {
          if (!entry.ok) {
            return (
              <p key={entry.key} className="text-sm text-destructive">
                此筆 decision record 無法顯示：{entry.message}
              </p>
            );
          }
          const record = entry.record;
          return (
            <AccordionItem
              key={record.id}
              value={record.id}
              id={`adr-${record.id}`}
              className="relative scroll-mt-20 border-0"
            >
              <span className="absolute top-5 -left-5 size-2.5 rounded-full border-2 border-background bg-primary" />
              <AccordionTrigger className="hover:no-underline">
                <span className="flex min-w-0 flex-wrap items-center gap-2 pr-2">
                  <Badge variant="outline">{record.id}</Badge>
                  <span>{record.title}</span>
                  {record.supersededBy && (
                    <Badge variant="secondary">
                      Superseded by {record.supersededBy}
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 pb-5">
                <div className="flex flex-wrap gap-1.5">
                  {record.capabilities.map((capability) => (
                    <Badge key={capability} variant="outline">
                      {capability}
                    </Badge>
                  ))}
                </div>

                {record.context && (
                  <div className="grid gap-1">
                    <h4 className="m-0 text-sm font-semibold">Context</h4>
                    <p className="m-0 text-sm text-muted-foreground">
                      {record.context}
                    </p>
                  </div>
                )}

                <div className="grid gap-1">
                  <h4 className="m-0 text-sm font-semibold">Decision</h4>
                  <p className="m-0 text-sm">{record.decision}</p>
                </div>

                {record.alternatives && record.alternatives.length > 0 && (
                  <div className="grid gap-2">
                    <h4 className="m-0 text-sm font-semibold">
                      Alternatives not chosen
                    </h4>
                    {record.alternatives.map((alternative) => (
                      <div
                        key={alternative.option}
                        className="rounded-lg border p-3"
                      >
                        <p className="m-0 text-sm font-medium">
                          {alternative.option}
                        </p>
                        <p className="m-0 mt-1 text-sm text-muted-foreground">
                          {alternative.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {record.consequences && (
                  <div className="grid gap-1">
                    <h4 className="m-0 text-sm font-semibold">Consequences</h4>
                    <ul className="m-0 grid gap-1 pl-5 text-sm">
                      {record.consequences.map((consequence) => (
                        <li key={consequence}>{consequence}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {record.revisitTriggers && (
                  <div className="grid gap-1">
                    <h4 className="m-0 text-sm font-semibold">
                      Revisit triggers
                    </h4>
                    <ul className="m-0 grid gap-1 pl-5 text-sm">
                      {record.revisitTriggers.map((trigger) => (
                        <li key={trigger}>{trigger}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {record.originChange && (
                  <p className="m-0 text-xs text-muted-foreground">
                    Origin Change: {record.originChange}
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
