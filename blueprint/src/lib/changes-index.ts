import "server-only";

import { source } from "@/lib/source";

export type ChangeSummary = { slug: string; title: string; href: string };

// A Change is a proposal.mdx + delivery.mdx pair under content/changes/<slug>/,
// gitignored and generated per gate. The index lists whatever exists locally
// by reading the proposal page's own frontmatter title, so it never drifts
// from a separate metadata file.
export function listChanges(): ChangeSummary[] {
  return source
    .getPages()
    .filter((page) => page.slugs.at(-1) === "proposal")
    .map((page) => ({
      slug: page.slugs[0],
      title: page.data.title,
      href: page.url,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
