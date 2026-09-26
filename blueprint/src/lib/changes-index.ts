import "server-only";

import { GATE_LABEL } from "@/lib/change-gate";
import {
  type ChangeFacts,
  readCapabilities,
  readFacts,
} from "@/lib/change-meta";
import { source } from "@/lib/source";

export type ChangeStatus = "archived" | "in-progress";

export type ChangeSummary = {
  slug: string;
  title: string;
  href: string;
  description?: string;
  state: { label: string; status: ChangeStatus };
  date?: { kind: "archived" | "started"; value: string };
  capabilities: string[];
  facts?: ChangeFacts;
};

type Dated = ChangeSummary & { order: string };

function changeDate(archivedAt?: string | null, startedAt?: string) {
  if (archivedAt) return { kind: "archived" as const, value: archivedAt };
  if (startedAt) return { kind: "started" as const, value: startedAt };
  return undefined;
}

// A Change is one top-level page.
function changePages(): Dated[] {
  return source
    .getPages()
    .filter((page) => page.slugs.length === 1)
    .map((page) => {
      const slug = page.slugs[0];
      const facts = readFacts(slug);
      const date = changeDate(facts.archivedAt, facts.startedAt);
      return {
        slug,
        title: page.data.title,
        href: page.url,
        description: page.data.description,
        state: facts.archivedAt
          ? { label: "archived", status: "archived" as const }
          : {
              label: GATE_LABEL[facts.gate ?? "G1"],
              status: "in-progress" as const,
            },
        date,
        capabilities: readCapabilities(slug),
        facts,
        order: date?.value ?? "",
      };
    });
}

// ADR-0078; a draft never published has no date and sorts last.
export function listChanges(): ChangeSummary[] {
  return changePages()
    .sort((a, b) => b.order.localeCompare(a.order))
    .map(({ order: _order, ...summary }) => summary);
}
