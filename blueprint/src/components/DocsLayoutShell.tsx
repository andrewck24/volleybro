"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Root } from "fumadocs-core/page-tree";

import { designSystemTree } from "@/lib/design-system-tree";
import { changesTree } from "@/lib/changes-tree";

// The (docs) route group shares one layout, but each nav tab needs its own
// sidebar tree. Fumadocs' DocsLayout takes a single `tree`, so we pick it here
// from the active path: /design-system uses its hand-authored tree, /features
// uses the features source tree, every other section keeps the changes tree.
export function DocsLayoutShell({
  featuresTree,
  children,
}: {
  featuresTree: Root;
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
