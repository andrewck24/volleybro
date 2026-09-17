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
        // A local build that never ran `pnpm blueprint:changes:pull` (or ran
        // it against an empty store) has no Change pages, so the tab is
        // unlisted rather than dropped: fumadocs' tab switcher hides itself
        // entirely when the current path matches no tab, so a direct /changes
        // visit still needs this tab present to reach Features or Design
        // System from there. `unlisted` just keeps it out of the switcher's
        // listing when it isn't the active tab.
        tabs: [
          { title: "Changes", url: "/changes", unlisted: !hasChanges },
          { title: "Features", url: "/features" },
          { title: "Design System", url: "/design-system" },
        ],
      }}
    >
      {children}
    </DocsLayout>
  );
}
