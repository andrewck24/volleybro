"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Root } from "fumadocs-core/page-tree";

import { designSystemTree } from "@/lib/design-system-tree";
import { changesTree } from "@/lib/changes-tree";

// The (docs) route group shares one layout, but each nav tab needs its own
// sidebar tree. Fumadocs' DocsLayout takes a single `tree`, so we pick it here
// from the active path: /design-system and /changes use their hand-authored
// trees, while unrelated sections retain the source tree supplied by dev.
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
    : pathname.startsWith("/changes")
      ? changesTree
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
