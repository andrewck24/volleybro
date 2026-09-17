import "server-only";

import { source } from "@/lib/source";
import { proposalMockups } from "@/lib/proposal-mockups";

export type ChangeSummary = { slug: string; title: string; href: string };

// A Change is a proposal.mdx + delivery.mdx pair under content/changes/<slug>/
// (proposal.mdx may instead, or also, be a proposal.tsx mockup), gitignored
// and generated per gate. The index lists every slug that has any of those,
// titled from whichever of proposal.mdx / delivery.mdx exists (proposal wins),
// falling back to the slug, and links to proposal if present else delivery.
export function listChanges(): ChangeSummary[] {
  const byPath = new Map(
    source.getPages().map((page) => [page.slugs.join("/"), page]),
  );
  const slugs = new Set(
    Array.from(byPath.keys())
      .filter(
        (path) => path.endsWith("/proposal") || path.endsWith("/delivery"),
      )
      .map((path) => path.split("/")[0])
      .concat(Object.keys(proposalMockups)),
  );

  return Array.from(slugs)
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
}
