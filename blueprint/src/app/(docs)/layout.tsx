import type { ReactNode } from "react";
import { featuresSource } from "@/lib/source";
import { changesTree, listChanges } from "@/lib/changes-index";
import { DocsLayoutShell } from "@/components/DocsLayoutShell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayoutShell
      changesTree={changesTree()}
      featuresTree={featuresSource.pageTree}
      hasChanges={listChanges().length > 0}
    >
      {children}
    </DocsLayoutShell>
  );
}
