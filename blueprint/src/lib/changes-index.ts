import "server-only";

import { GATE_LABEL } from "@/lib/change-gate";
import {
  type ChangeFacts,
  readCapabilities,
  readFacts,
} from "@/lib/change-meta";
import { createChangesTree } from "@/lib/changes-tree";
import { source } from "@/lib/source";

export type ChangeStatus = "archived" | "in-progress" | "draft";

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

// A converted draft never passed G1, so no gate describes it.
function changeState(facts: ChangeFacts): ChangeSummary["state"] {
  if (facts.archivedAt) return { label: "archived", status: "archived" };
  if (facts.converted && !facts.gate) {
    return { label: "draft", status: "draft" };
  }
  return { label: GATE_LABEL[facts.gate ?? "G1"], status: "in-progress" };
}

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
        state: changeState(facts),
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

export function changesTree() {
  return createChangesTree(
    source.pageTree,
    listChanges().map((change) => change.href),
  );
}
