"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Root } from "fumadocs-core/page-tree";

import { designSystemTree } from "@/lib/design-system-tree";

// The (docs) route group shares one layout, but each nav tab needs its own
// sidebar tree. Fumadocs' DocsLayout takes a single `tree`, so we pick it here
// from the active path: the /design-system section uses its hand-authored tree,
// every other section keeps the changes source tree unchanged.
export function DocsLayoutShell({
  tree,
  children,
}: {
  tree: Root;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const activeTree = pathname.startsWith("/design-system")
    ? designSystemTree
    : tree;

  return (
    <DocsLayout
      tree={activeTree}
      nav={{ title: "Blueprint" }}
      sidebar={{
        tabs: [
          { title: "Changes", url: "/changes" },
          { title: "Features", url: "/features" },
          { title: "Design System", url: "/design-system" },
        ],
      }}
    >
      {children}
    </DocsLayout>
  );
}
