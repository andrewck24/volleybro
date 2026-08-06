import type { ReactNode } from "react";
import { featuresSource } from "@/lib/source";
import { DocsLayoutShell } from "@/components/DocsLayoutShell";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayoutShell featuresTree={featuresSource.pageTree}>
      {children}
    </DocsLayoutShell>
  );
}
