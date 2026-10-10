import { gateLabel, mergedLabel } from "@/lib/change-gate";
import {
  type ChangeFacts,
  readCapabilities,
  readFacts,
} from "@/lib/change-meta";

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
  const merged = mergedLabel(facts);
  return {
    label: merged ? `${gateLabel(facts)} · ${merged}` : gateLabel(facts),
    status: "in-progress",
  };
}

export type ChangePage = {
  slugs: string[];
  url: string;
  data: { title?: string; description?: string };
};

function changePages(pages: ChangePage[], root?: string): Dated[] {
  return pages
    .filter((page) => page.slugs.length === 1)
    .map((page) => {
      const slug = page.slugs[0];
      const facts = readFacts(slug, root);
      const date = changeDate(facts.archivedAt, facts.startedAt);
      return {
        slug,
        title: page.data.title ?? slug,
        href: page.url,
        description: page.data.description,
        state: changeState(facts),
        date,
        capabilities: readCapabilities(slug, root),
        facts,
        order: date?.value ?? "",
      };
    });
}

// ADR-0078; a draft never published has no date and sorts last.
export function listChanges(
  pages: ChangePage[],
  root?: string,
): ChangeSummary[] {
  return changePages(pages, root)
    .sort((a, b) => b.order.localeCompare(a.order))
    .map(({ order: _order, ...summary }) => summary);
}
