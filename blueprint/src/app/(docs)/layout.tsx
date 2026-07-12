import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { DocsLayoutShell } from "@/components/DocsLayoutShell";

export default function Layout({ children }: { children: ReactNode }) {
  return <DocsLayoutShell tree={source.pageTree}>{children}</DocsLayoutShell>;
}
