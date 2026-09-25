import "server-only";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { source } from "@/lib/source";
import { CHANGES_ROOT, isLegacySlug } from "@/legacy/change-catalog";
import { SLUG_PATTERN, parseChangeMetadata } from "@/legacy/change-metadata";

export type ChangeSummary = { slug: string; title: string; href: string };

// Old-format Changes (a directory with change.json) sort after single-page
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

// A single-page Change is one top-level page; old-format directories are
// top-level too but are listed by legacyChanges() from their change.json.
export function listChanges(): ChangeSummary[] {
  const singlePage = source
    .getPages()
    .filter((page) => page.slugs.length === 1 && !isLegacySlug(page.slugs[0]))
    .map((page) => ({
      slug: page.slugs[0],
      title: page.data.title,
      href: page.url,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return [...singlePage, ...legacyChanges()];
}
