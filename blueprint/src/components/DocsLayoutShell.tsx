"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Root } from "fumadocs-core/page-tree";

import { designSystemTree } from "@/lib/design-system-tree";

// The (docs) route group shares one layout, but each nav tab needs its own
// sidebar tree. Fumadocs' DocsLayout takes a single `tree`, so we pick it here
// from the active path: /design-system uses its hand-authored tree, /features
// and /changes each use their own source tree.
export function DocsLayoutShell({
  changesTree,
  featuresTree,
  hasChanges,
  children,
}: {
  changesTree: Root;
  featuresTree: Root;
  hasChanges: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activeTree = pathname.startsWith("/design-system")
    ? designSystemTree
    : pathname.startsWith("/features")
      ? featuresTree
      : changesTree;

  return (
    <DocsLayout
      tree={activeTree}
      nav={{ title: "Blueprint" }}
      sidebar={{
        // The deployed site builds without Change pages, so the tab is
        // dropped rather than left pointing at an empty list. The /changes
        // route itself keeps working for a direct visit or a local `dev`.
        tabs: [
          ...(hasChanges ? [{ title: "Changes", url: "/changes" }] : []),
          { title: "Features", url: "/features" },
          { title: "Design System", url: "/design-system" },
        ],
      }}
    >
      {children}
    </DocsLayout>
  );
}
