import type { ReactNode } from "react";
import { source, featuresSource } from "@/lib/source";
import { listChanges } from "@/lib/changes-index";
import { DocsLayoutShell } from "@/components/DocsLayoutShell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayoutShell
      changesTree={source.pageTree}
      featuresTree={featuresSource.pageTree}
      hasChanges={listChanges().length > 0}
    >
      {children}
    </DocsLayoutShell>
  );
}
