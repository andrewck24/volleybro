import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
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
