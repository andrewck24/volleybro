import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { source } from "@/lib/source";
import { proposalMockups } from "@/lib/proposal-mockups";
import { CHANGES_ROOT, isLegacySlug } from "@/legacy/change-catalog";
import { SLUG_PATTERN, parseChangeMetadata } from "@/legacy/change-metadata";

export type ChangeSummary = { slug: string; title: string; href: string };

// Old-format Changes (a directory with change.json) sort after two-gate
// Changes, newest-dated first: this index is read synchronously by the page,
// so it reads change.json directly rather than through the async legacy
// loader used by the page routes.
function legacyChanges(): ChangeSummary[] {
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
      return [
        {
          slug: metadata.slug,
          title: metadata.title,
          href: `/changes/${metadata.slug}`,
          order: metadata.archivedAt ?? metadata.startedAt,
        },
      ];
    })
    .sort((a, b) => b.order.localeCompare(a.order))
    .map(({ order: _order, ...summary }) => summary);
}

// A proposal.tsx mockup has no Fumadocs page, so it needs its own slug
// source (proposalMockups) alongside source.getPages().
export function listChanges(): ChangeSummary[] {
  const byPath = new Map(
    source.getPages().map((page) => [page.slugs.join("/"), page]),
  );
  const slugs = new Set(
    Array.from(byPath.keys())
      .filter(
        (pagePath) =>
          pagePath.endsWith("/proposal") || pagePath.endsWith("/delivery"),
      )
      .map((pagePath) => pagePath.split("/")[0])
      // Old-format directories carry a change.json and are listed by
      // legacyChanges() below; skip them here even when they also have a
      // leftover proposal.mdx, or they would be listed twice.
      .filter((slug) => !isLegacySlug(slug))
      .concat(Object.keys(proposalMockups)),
  );

  const twoGate = Array.from(slugs)
    .map((slug) => {
      const proposal = byPath.get(`${slug}/proposal`);
      const delivery = byPath.get(`${slug}/delivery`);
      return {
        slug,
        title: proposal?.data.title ?? delivery?.data.title ?? slug,
        href: proposal?.url ?? delivery?.url ?? `/changes/${slug}/proposal`,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return [...twoGate, ...legacyChanges()];
}
