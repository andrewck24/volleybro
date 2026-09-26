import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { GATE_LABEL } from "@/lib/change-gate";
import { readCapabilities, readFacts } from "@/lib/change-meta";
import { source } from "@/lib/source";
import { CHANGES_ROOT, isLegacySlug } from "@/legacy/change-catalog";
import { SLUG_PATTERN, parseChangeMetadata } from "@/legacy/change-metadata";

export type ChangeStatus = "archived" | "in-progress" | "discussing";

export type ChangeSummary = {
  slug: string;
  title: string;
  href: string;
  description?: string;
  state: { label: string; status: ChangeStatus };
  date?: { kind: "archived" | "started"; value: string };
  capabilities: string[];
};

type Dated = ChangeSummary & { order: string };

function changeDate(archivedAt?: string | null, startedAt?: string) {
  if (archivedAt) return { kind: "archived" as const, value: archivedAt };
  if (startedAt) return { kind: "started" as const, value: startedAt };
  return undefined;
}

// Read synchronously by the page, so change.json is read directly rather
// than through the async legacy loader the page routes use.
function legacyChanges(): Dated[] {
  if (!existsSync(CHANGES_ROOT)) return [];

  return readdirSync(CHANGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SLUG_PATTERN.test(entry.name))
    .flatMap((entry) => {
      const changeJsonPath = path.join(CHANGES_ROOT, entry.name, "change.json");
      if (!existsSync(changeJsonPath)) return [];
      const metadata = parseChangeMetadata(
        JSON.parse(readFileSync(changeJsonPath, "utf8")),
        entry.name,
      );
      const date = changeDate(metadata.archivedAt, metadata.startedAt);
      return [
        {
          slug: metadata.slug,
          title: metadata.title,
          href: `/changes/${metadata.slug}`,
          description: metadata.summary,
          state: { label: metadata.lifecycle, status: metadata.status },
          date,
          capabilities: metadata.capabilities,
          order: date?.value ?? "",
        },
      ];
    });
}

// A single-page Change is one top-level page; old-format directories are
// top-level too but are listed by legacyChanges() from their change.json.
function singlePageChanges(): Dated[] {
  return source
    .getPages()
    .filter((page) => page.slugs.length === 1 && !isLegacySlug(page.slugs[0]))
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
        order: date?.value ?? "",
      };
    });
}

// ADR-0078; a draft never published has no date and sorts last.
export function listChanges(): ChangeSummary[] {
  return [...singlePageChanges(), ...legacyChanges()]
    .sort((a, b) => b.order.localeCompare(a.order))
    .map(({ order: _order, ...summary }) => summary);
}
