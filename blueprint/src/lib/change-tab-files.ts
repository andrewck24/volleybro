import "server-only";

import { changeTabs } from "../../.source/server";

import type { TabBody } from "@/components/ChangeTabs";

// ADR-0094: proposal.mdx, then review.mdx for an ordinary Change or
// review-s<N>.mdx for each shard of a Migration.
const TAB_FILE = /^([^/]+)\/(proposal|review)(?:-s([1-9]\d*))?\.mdx$/;

export type ChangeTabFiles = {
  Proposal?: TabBody;
  reviews: { shard?: number; Body: TabBody }[];
};

export function changeTabFiles(slug: string): ChangeTabFiles {
  const files: ChangeTabFiles = { reviews: [] };
  for (const entry of changeTabs) {
    const match = entry.info.path.replace(/\\/g, "/").match(TAB_FILE);
    if (!match || match[1] !== slug) continue;
    const Body = entry.body as TabBody;
    if (match[2] === "proposal") {
      files.Proposal = Body;
    } else {
      files.reviews.push({
        shard: match[3] ? Number(match[3]) : undefined,
        Body,
      });
    }
  }
  files.reviews.sort((a, b) => (a.shard ?? 0) - (b.shard ?? 0));
  return files;
}
